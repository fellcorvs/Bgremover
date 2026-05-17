"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type BrushMode = "erase" | "restore";

interface UseManualEditOptions {
  imageUrl: string | null;
  maskUrl: string | null;
}

interface UseManualEditReturn {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  canvasCallbackRef: (node: HTMLCanvasElement | null) => void;
  isDrawing: boolean;
  brushSize: number;
  brushMode: BrushMode;
  setBrushSize: (size: number) => void;
  setBrushMode: (mode: BrushMode) => void;
  startDrawing: (x: number, y: number) => void;
  draw: (x: number, y: number) => void;
  stopDrawing: () => void;
  getResultBlob: () => Promise<Blob | null>;
  resetMask: () => void;
  undoLastStroke: () => void;
}

export function useManualEdit({
  imageUrl,
  maskUrl,
}: UseManualEditOptions): UseManualEditReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasMounted, setCanvasMounted] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<BrushMode>("erase");

  const originalRef = useRef<HTMLImageElement | null>(null);
  const maskDataRef = useRef<ImageData | null>(null);
  const drawHistory = useRef<ImageData[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const initialized = useRef(false);

  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
    setCanvasMounted(!!node);
  }, []);

  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const maskData = maskDataRef.current;
    if (!canvas || !orig || !maskData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(orig, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < imageData.data.length; i += 4) {
      imageData.data[i] = maskData.data[i];
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const loadMaskImages = useCallback(async () => {
    if (!imageUrl || !maskUrl) return;
    const [img, maskImg] = await Promise.all([
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageUrl;
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = maskUrl;
      }),
    ]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;

    originalRef.current = img;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.drawImage(maskImg, 0, 0, w, h);
    maskDataRef.current = tempCtx.getImageData(0, 0, w, h);

    initialized.current = true;
    renderComposite();
  }, [imageUrl, maskUrl, renderComposite]);

  useEffect(() => {
    if (!canvasRef.current) return;
    initialized.current = false;
    maskDataRef.current = null;
    originalRef.current = null;
    drawHistory.current = [];
    loadMaskImages();
  }, [loadMaskImages, canvasMounted]);

  const saveState = useCallback(() => {
    const maskData = maskDataRef.current;
    if (!maskData) return;
    const copy = new ImageData(
      new Uint8ClampedArray(maskData.data),
      maskData.width,
      maskData.height
    );
    drawHistory.current.push(copy);
    if (drawHistory.current.length > 30) drawHistory.current.shift();
  }, []);

  const applyBrush = useCallback(
    (x: number, y: number) => {
      const maskData = maskDataRef.current;
      const canvas = canvasRef.current;
      if (!maskData || !canvas) return;

      const r = brushSize / 2;
      const cx = Math.round(x);
      const cy = Math.round(y);
      const w = canvas.width;
      const h = canvas.height;
      const data = maskData.data;

      const isErase = brushMode === "erase";

      for (let py = Math.max(0, cy - r); py < Math.min(h, cy + r); py++) {
        for (let px = Math.max(0, cx - r); px < Math.min(w, cx + r); px++) {
          const dx = px - cx;
          const dy = py - cy;
          if (dx * dx + dy * dy <= r * r) {
            const idx = (py * w + px) * 4;
            if (isErase) {
              data[idx + 3] = 0;
            } else {
              data[idx] = 255;
              data[idx + 1] = 255;
              data[idx + 2] = 255;
              data[idx + 3] = 255;
            }
          }
        }
      }
    },
    [brushSize, brushMode]
  );

  const startDrawing = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !initialized.current) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (x - rect.left) * scaleX;
      const cy = (y - rect.top) * scaleY;

      saveState();
      lastPoint.current = { x: cx, y: cy };
      setIsDrawing(true);
    },
    [saveState]
  );

  const draw = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !lastPoint.current) return;
      const canvas = canvasRef.current;
      if (!canvas || !initialized.current) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (x - rect.left) * scaleX;
      const cy = (y - rect.top) * scaleY;

      const fromX = lastPoint.current.x;
      const fromY = lastPoint.current.y;
      const dist = Math.sqrt((cx - fromX) ** 2 + (cy - fromY) ** 2);
      const steps = Math.max(1, Math.ceil(dist / 3));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const ix = fromX + (cx - fromX) * t;
        const iy = fromY + (cy - fromY) * t;
        applyBrush(ix, iy);
      }

      lastPoint.current = { x: cx, y: cy };

      renderComposite();
    },
    [isDrawing, applyBrush, renderComposite]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const getResultBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const maskData = maskDataRef.current;
    if (!canvas || !orig || !maskData || !imageUrl) return null;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;
    const outCtx = outCanvas.getContext("2d")!;

    outCtx.drawImage(orig, 0, 0, outCanvas.width, outCanvas.height);
    const imageData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height);
    for (let i = 3; i < imageData.data.length; i += 4) {
      imageData.data[i] = maskData.data[i];
    }
    outCtx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [imageUrl]);

  const resetMask = useCallback(() => {
    if (!maskUrl || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(img, 0, 0, w, h);
      maskDataRef.current = tempCtx.getImageData(0, 0, w, h);
      drawHistory.current = [];
      renderComposite();
    };
    img.src = maskUrl;
  }, [maskUrl, renderComposite]);

  const undoLastStroke = useCallback(() => {
    if (drawHistory.current.length === 0) return;
    const prevState = drawHistory.current.pop()!;
    maskDataRef.current = prevState;
    renderComposite();
  }, [renderComposite]);

  return {
    canvasRef,
    canvasCallbackRef,
    isDrawing,
    brushSize,
    brushMode,
    setBrushSize,
    setBrushMode,
    startDrawing,
    draw,
    stopDrawing,
    getResultBlob,
    resetMask,
    undoLastStroke,
  };
}
