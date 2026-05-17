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

function cap(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function resizeImage(file: File | Blob | string, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof file === "string" ? file : URL.createObjectURL(file);
    img.onload = () => {
      if (typeof file !== "string") URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w <= maxDim && h <= maxDim) {
        if (file instanceof Blob) resolve(file);
        else fetch(file).then((r) => r.blob()).then(resolve).catch(reject);
        return;
      }
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.85);
    };
    img.onerror = () => { if (typeof file !== "string") URL.revokeObjectURL(url); reject(new Error("Failed to load image for resize")); };
    img.src = url;
  });
}

function upscaleMask(maskBlob: Blob, targetW: number, targetH: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(maskBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, targetW, targetH);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Upscale toBlob failed")), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load mask for upscale")); };
    img.src = url;
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

  const model = options?.model || "isnet_quint8";

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

        progressRef.current = 20;

        const origImg = new Image();
        const origUrl = typeof file === "string" ? file : URL.createObjectURL(file);
        await new Promise<void>((res, rej) => { origImg.onload = () => res(); origImg.onerror = () => rej(); origImg.src = origUrl; });
        const origW = origImg.width;
        const origH = origImg.height;

        const resized = await resizeImage(file, 800);
        progressRef.current = 30;

        const blob = await removeBackground(resized, {
          model,
          output: { format: "image/png", quality: 1 },
          progress: (p: number) => {
            const safe = typeof p === "number" && !Number.isNaN(p) ? p : 0;
            progressRef.current = cap(30 + (safe > 1 ? safe * 0.7 : safe * 65));
          },
        });

        if (abortController.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        progressRef.current = 90;
        const result = origW <= 800 && origH <= 800 ? blob : await upscaleMask(blob, origW, origH);
        progressRef.current = 100;
        setProgress(100);
        return result;
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
