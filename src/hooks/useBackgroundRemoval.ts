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
    const rmBg = mod.removeBackground as any;
    isnetPreloaded = rmBg;
    // Trigger model download with a 64x64 PNG (model needs real pixels)
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, 64, 64);
    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await rmBg(blob, {
            model: "isnet_fp16",
            output: { format: "image/png", quality: 1 },
            progress: () => {},
          });
        } catch { /* warm-up failure is non-fatal */ }
      }
    });
  })();
}

function cap(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

async function removeBgWithBria(blob: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  onProgress?.(10);
  const formData = new FormData();
  const fileName = blob instanceof File ? blob.name : "image.png";
  formData.append("file", blob, fileName);
  formData.append("method", "bria_rmbg_1_4");
  onProgress?.(30);
  const resp = await fetch("/api/remove-bg", {
    method: "POST",
    body: formData,
  });
  onProgress?.(80);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || "BRIA server request failed");
  }
  const data = await resp.json();
  if (!data.success || !data.data?.processedUrl) {
    throw new Error("BRIA server returned no result");
  }
  onProgress?.(90);
  const imgResp = await fetch(data.data.processedUrl);
  if (!imgResp.ok) {
    const errText = await imgResp.text().catch(() => imgResp.statusText);
    throw new Error(`Failed to fetch processed result: ${errText}`);
  }
  const resultBlob = await imgResp.blob();
  onProgress?.(100);
  return resultBlob;
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
