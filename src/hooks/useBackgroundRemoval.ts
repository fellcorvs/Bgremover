"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type BgRemovalModel = "isnet_fp16" | "bria_rmbg_1_4";

interface UseBackgroundRemovalOptions {
  model?: BgRemovalModel;
}

interface UseBackgroundRemovalReturn {
  processFile: (file: File | Blob | string) => Promise<Blob>;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  cancel: () => void;
}

let isnetPreloaded: ((file: any, opts?: any) => Promise<Blob>) | null = null;

function configureOnnxRuntime(): void {
  if (typeof window === "undefined") return;

  const ort = (window as any).ort;
  if (!ort?.env?.wasm) return;

  ort.env.wasm.wasmPaths = {
    mjs: "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
    wasm: "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
  };
  ort.env.wasm.proxy = false;
}

function preloadModel(): Promise<void> {
  if (isnetPreloaded) return Promise.resolve();
  return (async () => {
    configureOnnxRuntime();
    const mod = await import("@imgly/background-removal");
    isnetPreloaded = mod.removeBackground as any;
  })();
}

function cap(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

async function removeBgWithBria(blob: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  let currentProgress = 10;
  const update = (p: number) => { currentProgress = p; onProgress?.(p); };
  update(10);
  const simInterval = setInterval(() => {
    if (currentProgress < 95) {
      const remaining = 95 - currentProgress;
      currentProgress = cap(currentProgress + Math.max(0.3, remaining * 0.04));
      onProgress?.(currentProgress);
    }
  }, 250);
  try {
    configureOnnxRuntime();
    // @ts-expect-error - served from public/ folder, bypasses webpack
    const mod: any = await import(/* webpackIgnore: true */ "/transformers-web.js");
    update(20);
    const model = await mod.AutoModel.from_pretrained("briaai/RMBG-1.4", {
      dtype: "fp32",
      progress_callback: (p: any) => {
        if (p?.status === "progress") update(cap(20 + (p.progress || 0) * 30));
      },
    });
    update(50);
    const processor = await mod.AutoProcessor.from_pretrained("briaai/RMBG-1.4");
    update(60);
    const image = await mod.RawImage.fromBlob(blob);
    update(65);
    const { pixel_values } = await processor(image);
    update(70);
    const { output } = await model({ input: pixel_values });
    update(80);
    const maskTensor = output[0].mul(255).to("uint8");
    const maskImage = await mod.RawImage.fromTensor(maskTensor).resize(image.width, image.height);
    update(85);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image.toCanvas(), 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < imgData.data.length; i += 4) {
      imgData.data[i] = maskImage.data[Math.floor(i / 4)];
    }
    ctx.putImageData(imgData, 0, 0);
    update(95);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  } finally {
    clearInterval(simInterval);
  }
}

export function useBackgroundRemoval(
  options?: UseBackgroundRemovalOptions
): UseBackgroundRemovalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const progressRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const model = options?.model || "isnet_fp16";

  useEffect(() => {
    if (isProcessing) {
      intervalRef.current = setInterval(() => {
        setProgress(progressRef.current);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isProcessing]);

  const processFile = useCallback(
    async (file: File | Blob | string): Promise<Blob> => {
      setIsProcessing(true);
      progressRef.current = 0;
      setProgress(0);
      setError(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        progressRef.current = 5;

        let fileBlob: Blob;
        if (typeof file === "string") {
          const resp = await fetch(file);
          fileBlob = await resp.blob();
        } else {
          fileBlob = file;
        }

        if (model === "bria_rmbg_1_4") {
          progressRef.current = 10;
          const blob = await removeBgWithBria(fileBlob, (p) => {
            if (abortController.signal.aborted) return;
            progressRef.current = cap(p);
          });
          if (abortController.signal.aborted) throw new DOMException("Aborted", "AbortError");
          progressRef.current = 100;
          setProgress(100);
          return blob;
        }

        progressRef.current = 10;

        let removeBackground: (file: any, opts?: any) => Promise<Blob>;
        if (isnetPreloaded) {
          removeBackground = isnetPreloaded;
        } else {
          configureOnnxRuntime();
          const mod = await import("@imgly/background-removal");
          removeBackground = mod.removeBackground as any;
        }

        progressRef.current = 20;

        const blob = await removeBackground(fileBlob, {
          model: "isnet_fp16",
          output: { format: "image/png", quality: 1 },
          progress: (p: number) => {
            const safe = typeof p === "number" && !Number.isNaN(p) ? p : 0;
            progressRef.current = cap(20 + (safe > 1 ? safe * 0.8 : safe * 70));
          },
        });

        if (abortController.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        progressRef.current = 100;
        setProgress(100);
        return blob;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Processing cancelled");
          throw err;
        }
        const message = err instanceof Error ? err.message : "Background removal failed";
        setError(message);
        throw new Error(message);
      } finally {
        setIsProcessing(false);
        abortRef.current = null;
      }
    },
    [model]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsProcessing(false);
    progressRef.current = 0;
    setProgress(0);
  }, []);

  return {
    processFile,
    isProcessing,
    progress,
    error,
    cancel,
  };
}

export { preloadModel, removeBgWithBria };
