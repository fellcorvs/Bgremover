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
  redoLastStroke: () => void;
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
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawHistory = useRef<HTMLCanvasElement[]>([]);
  const redoHistory = useRef<HTMLCanvasElement[]>([]);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const initialized = useRef(false);

  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
    setCanvasMounted(!!node);
  }, []);

  const renderComposite = useCallback(() => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !orig || !maskCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(orig, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const loadMaskImages = useCallback(async (canvas: HTMLCanvasElement) => {
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

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;

    originalRef.current = img;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.drawImage(maskImg, 0, 0, w, h);
    maskCanvasRef.current = maskCanvas;

    initialized.current = true;
    renderComposite();
  }, [imageUrl, maskUrl, renderComposite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initialized.current = false;
    maskCanvasRef.current = null;
    originalRef.current = null;
    drawHistory.current = [];
    loadMaskImages(canvas);
  }, [loadMaskImages, canvasMounted]);

  const saveState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const clone = document.createElement("canvas");
    clone.width = maskCanvas.width;
    clone.height = maskCanvas.height;
    const ctx = clone.getContext("2d")!;
    ctx.drawImage(maskCanvas, 0, 0);

    drawHistory.current.push(clone);
    if (drawHistory.current.length > 30) drawHistory.current.shift();
    redoHistory.current = [];
  }, []);

  const drawLineOnMask = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const maskCtx = maskCanvas.getContext("2d");
      if (!maskCtx) return;

      if (brushMode === "erase") {
        maskCtx.globalCompositeOperation = "destination-out";
      } else {
        maskCtx.globalCompositeOperation = "source-over";
      }

      maskCtx.strokeStyle = "white";
      maskCtx.lineWidth = brushSize;
      maskCtx.lineCap = "round";
      maskCtx.beginPath();
      maskCtx.moveTo(fromX, fromY);
      maskCtx.lineTo(toX, toY);
      maskCtx.stroke();
      maskCtx.globalCompositeOperation = "source-over";
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

      drawLineOnMask(lastPoint.current.x, lastPoint.current.y, cx, cy);
      lastPoint.current = { x: cx, y: cy };

      renderComposite();
    },
    [isDrawing, drawLineOnMask, renderComposite]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const getResultBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    const orig = originalRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !orig || !maskCanvas) return null;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height;
    const outCtx = outCanvas.getContext("2d")!;

    outCtx.drawImage(orig, 0, 0, outCanvas.width, outCanvas.height);
    outCtx.globalCompositeOperation = "destination-in";
    outCtx.drawImage(maskCanvas, 0, 0, outCanvas.width, outCanvas.height);
    outCtx.globalCompositeOperation = "source-over";

    return new Promise((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const resetMask = useCallback(() => {
    if (!maskUrl || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.drawImage(img, 0, 0, maskCanvas.width, maskCanvas.height);
      drawHistory.current = [];
      redoHistory.current = [];
      renderComposite();
    };
    img.src = maskUrl;
  }, [maskUrl, renderComposite]);

  const undoLastStroke = useCallback(() => {
    if (drawHistory.current.length === 0) return;
    const prevState = drawHistory.current.pop()!;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const currentState = document.createElement("canvas");
    currentState.width = maskCanvas.width;
    currentState.height = maskCanvas.height;
    const curCtx = currentState.getContext("2d")!;
    curCtx.drawImage(maskCanvas, 0, 0);
    redoHistory.current.push(currentState);

    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(prevState, 0, 0);

    renderComposite();
  }, [renderComposite]);

  const redoLastStroke = useCallback(() => {
    if (redoHistory.current.length === 0) return;
    const nextState = redoHistory.current.pop()!;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const currentState = document.createElement("canvas");
    currentState.width = maskCanvas.width;
    currentState.height = maskCanvas.height;
    const curCtx = currentState.getContext("2d")!;
    curCtx.drawImage(maskCanvas, 0, 0);
    drawHistory.current.push(currentState);

    const maskCtx = maskCanvas.getContext("2d")!;
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.drawImage(nextState, 0, 0);

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
    redoLastStroke,
  };
}
