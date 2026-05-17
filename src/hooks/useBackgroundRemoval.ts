"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type BgRemovalModel = "isnet" | "isnet_fp16" | "isnet_quint8";

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

let preloadedRemover: ((file: any, opts?: any) => Promise<Blob>) | null = null;
let preloadPromise: Promise<void> | null = null;

function preloadModel(): Promise<void> {
  if (preloadedRemover) return Promise.resolve();
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    if (typeof window !== "undefined" && (window as any).ort?.env?.wasm) {
      (window as any).ort.env.wasm.wasmPaths = "/onnxruntime-web/";
    }
    const mod = await import("@imgly/background-removal");
    preloadedRemover = mod.removeBackground as any;
  })();
  return preloadPromise;
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
        await new Promise((r) => setTimeout(r, 0));
        progressRef.current = 10;

        let removeBackground: (file: any, opts?: any) => Promise<Blob>;

        if (preloadedRemover) {
          removeBackground = preloadedRemover as any;
        } else {
          if (typeof window !== "undefined" && (window as any).ort?.env?.wasm) {
            (window as any).ort.env.wasm.wasmPaths = "/onnxruntime-web/";
          }
          const mod = await import("@imgly/background-removal");
          removeBackground = mod.removeBackground as any;
        }

        progressRef.current = 15;

        const simTimer = setInterval(() => {
          const cur = progressRef.current;
          if (cur < 40) progressRef.current = Math.min(40, cur + Math.random() * 4);
        }, 250);

        const blob = await removeBackground(file, {
          model,
          output: { format: "image/png", quality: 1 },
          progress: (p: number) => {
            clearInterval(simTimer);
            const safe = typeof p === "number" && !Number.isNaN(p) ? p : 0;
            progressRef.current = 15 + Math.round(safe * 80);
          },
        });

        clearInterval(simTimer);

        if (abortController.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        progressRef.current = 95;
        await new Promise((r) => setTimeout(r, 50));
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

export { preloadModel };
