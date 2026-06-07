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
let briaRuntimePromise: Promise<any> | null = null;

function configureOnnxRuntime(useWebGpu = false): void {
  if (typeof window === "undefined") return;
  const ort = (window as any).ort;
  if (!ort?.env?.wasm) return;
  ort.env.wasm.wasmPaths = {
    mjs: useWebGpu
      ? "/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs"
      : "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
    wasm: useWebGpu
      ? "/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm"
      : "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
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

async function loadBriaRuntime(
  mod: any,
  onProgress?: (p: number) => void
): Promise<any> {
  if (briaRuntimePromise) return briaRuntimePromise;

  briaRuntimePromise = (async () => {
    const useWebGpu =
      typeof navigator !== "undefined" && Boolean((navigator as any).gpu);
    configureOnnxRuntime(useWebGpu);

    const progress_callback = (p: any) => {
      if (p?.status !== "progress") return;
      const reported = Number(p.progress) || 0;
      const percent = reported <= 1 ? reported * 100 : reported;
      onProgress?.(20 + Math.min(100, Math.max(0, percent)) * 0.3);
    };

    try {
      const segmenter = await mod.pipeline("image-segmentation", "briaai/RMBG-1.4", {
        device: useWebGpu ? "webgpu" : "wasm",
        ...(useWebGpu ? {} : { dtype: "q8" }),
        progress_callback,
      });
      return segmenter;
    } catch (error) {
      if (!useWebGpu) throw error;

      console.warn("BRIA WebGPU failed; falling back to q8 WASM.", error);
      const segmenter = await mod.pipeline("image-segmentation", "briaai/RMBG-1.4", {
        device: "wasm",
        dtype: "q8",
        progress_callback,
      });
      return segmenter;
    }
  })().catch((error) => {
    briaRuntimePromise = null;
    throw error;
  });

  return briaRuntimePromise;
}

async function removeBgWithBria(blob: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  let currentProgress = 10;
  const update = (p: number) => {
    currentProgress = Math.max(currentProgress, Math.min(95, cap(p)));
    onProgress?.(currentProgress);
  };
  update(10);

  configureOnnxRuntime();
  // @ts-expect-error - served from public/ folder, bypasses webpack
  const mod: any = await import(/* webpackIgnore: true */ "/transformers-web.js");
  update(20);
  const segmenter = await loadBriaRuntime(mod, update);
  update(50);
  const image = await mod.RawImage.fromBlob(blob);
  update(60);
  const result = await Promise.race([
    segmenter(image),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("BRIA inference timed out. Use current Chrome or Edge with WebGPU enabled.")),
        60_000
      );
    }),
  ]);
  update(90);
  const maskCanvas = result?.[0]?.mask;
  if (!maskCanvas) throw new Error("BRIA model returned no mask");
  update(94);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image.toCanvas(), 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mCtx = document.createElement("canvas").getContext("2d")!;
  mCtx.canvas.width = canvas.width;
  mCtx.canvas.height = canvas.height;
  mCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
  const maskData = mCtx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < imgData.data.length; i += 4) {
    imgData.data[i] = maskData[i - 3];
  }
  ctx.putImageData(imgData, 0, 0);
  update(95);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blobResult) => blobResult ? resolve(blobResult) : reject(new Error("Failed to create BRIA output image.")),
      "image/png"
    );
  });
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.debug("[BgRemoval] crossOriginIsolated:", (self as any).crossOriginIsolated);
      console.debug("[BgRemoval] SharedArrayBuffer available:", typeof SharedArrayBuffer !== "undefined");
    }
  }, []);

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
          progress: (_stage: string, current: number, total: number) => {
            const pct = total > 0 ? Math.min(1, current / total) : 0;
            progressRef.current = cap(20 + pct * 70);
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
