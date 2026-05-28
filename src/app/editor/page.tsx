"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/features/ImageUpload";
import { BeforeAfter } from "@/components/features/BeforeAfter";
import { ManualEditor } from "@/components/features/ManualEditor";
import { BackgroundEditor } from "@/components/features/BackgroundEditor";
import { AnimatedProgress } from "@/components/features/AnimatedProgress";
import { SubjectAdjustments } from "@/components/features/SubjectAdjustments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useBackgroundRemoval, preloadModel } from "@/hooks/useBackgroundRemoval";
import { useManualEdit } from "@/hooks/useManualEdit";
import { BackgroundOptions, TextOverlay } from "@/types";
import { compositeBackground, createMaskFromTransparent, generateId } from "@/lib/utils";
import {
  Sparkles,
  Download,
  Image as ImageIcon,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [compositedUrl, setCompositedUrl] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [background, setBackground] = useState<BackgroundOptions>({
    type: "transparent",
    filters: { brightness: 100, contrast: 100, saturation: 100, opacity: 100 },
  });
  const { processFile, isProcessing, progress } = useBackgroundRemoval();
  const { toast } = useToast();
  const compositeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [showSubjectOverlay, setShowSubjectOverlay] = useState(false);
  const [showDimOverlay, setShowDimOverlay] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);
  const [showManualOverlay, setShowManualOverlay] = useState(false);
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const [targetWidthStr, setTargetWidthStr] = useState("");
  const [targetHeightStr, setTargetHeightStr] = useState("");
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [dimensionUnit, setDimensionUnit] = useState<"px" | "in" | "cm" | "ft">("px");

  const targetWidth = targetWidthStr === "" ? 0 : Number(targetWidthStr);
  const targetHeight = targetHeightStr === "" ? 0 : Number(targetHeightStr);

  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPanX, setCanvasPanX] = useState(0);
  const [canvasPanY, setCanvasPanY] = useState(0);
  const [canvasPanMode, setCanvasPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const [cropDragging, setCropDragging] = useState(false);
  const [cropDragMode, setCropDragMode] = useState<"move" | "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w" | null>(null);
  const cropDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);

  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [textDragging, setTextDragging] = useState(false);
  const textDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [textSizeInputValue, setTextSizeInputValue] = useState("");

  const [photoBorder, setPhotoBorder] = useState<{ width: number; color: string; shape: "rectangle" | "rounded" | "circle"; radius: number; enabled: boolean }>({
    width: 10, color: "#ffffff", shape: "rectangle", radius: 0, enabled: false,
  });
  const [showBorderOverlay, setShowBorderOverlay] = useState(false);

  const textPanelPos = useRef({ x: 0, y: 0 });
  const [textPanelOffset, setTextPanelOffset] = useState({ x: 0, y: 0 });
  const textPanelRef = useRef<HTMLDivElement>(null);
  const textPanelDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => { preloadModel(); }, []);

  const manualEdit = useManualEdit({
    imageUrl: preview,
    maskUrl,
  });

  useEffect(() => {
    if (selectedTextId) {
      const t = texts.find(t => t.id === selectedTextId);
      setTextSizeInputValue(t ? String(t.fontSize) : "");
    }
  }, [texts, selectedTextId]);

  const handleFileSelect = useCallback((file: File) => {
    setFile(file);
    if (preview) URL.revokeObjectURL(preview);
    if (compositedUrl && compositedUrl !== processedUrl) URL.revokeObjectURL(compositedUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    setPreview(URL.createObjectURL(file));
    setProcessedUrl(null);
    setMaskUrl(null);
    setCompositedUrl(null);
    setError(null);
    setProcessingTime(null);
    setShowManualEditor(false);
    setCanvasZoom(1);
    setCanvasPanX(0);
    setCanvasPanY(0);
    setFlipH(false);
    setFlipV(false);
    setCropX(0);
    setCropY(0);
    setCropW(0);
    setCropH(0);
    setTexts([]);
    setSelectedTextId(null);
  }, [preview, compositedUrl, processedUrl, maskUrl]);

  const handleRemoveBackground = async () => {
    if (!file) return;
    setError(null);
    const startTime = Date.now();
    try {
      const blob = await processFile(file);
      const endTime = Date.now();
      const url = URL.createObjectURL(blob);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      if (maskUrl) URL.revokeObjectURL(maskUrl);
      setProcessedUrl(url);
      setProcessingTime(endTime - startTime);
      toast({
        title: "Background removed!",
        description: `Processed in ${((endTime - startTime) / 1000).toFixed(1)}s`,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      setError(message);
      toast({ title: "Processing failed", description: message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!processedUrl) { setMaskUrl(null); return; }
    let cancelled = false;
    (async () => {
      const mask = await createMaskFromTransparent(processedUrl);
      if (!cancelled) setMaskUrl(mask);
    })();
    return () => { cancelled = true; };
  }, [processedUrl]);

  const displayUrl = useMemo(() => {
    return compositedUrl || processedUrl;
  }, [compositedUrl, processedUrl]);

  const dimensionActive = useMemo(() => {
    return targetWidth > 0 && targetHeight > 0 && origWidth > 0 && origHeight > 0 &&
      (targetWidth !== origWidth || targetHeight !== origHeight);
  }, [targetWidth, targetHeight, origWidth, origHeight]);

  useEffect(() => {
    if (!displayUrl) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setOrigWidth(w);
      setOrigHeight(h);
      if (targetWidthStr === "") {
        setTargetWidthStr(String(w));
        setTargetHeightStr(String(h));
      }
      if (cropW === 0) setCropW(w);
      if (cropH === 0) setCropH(h);
    };
    img.src = displayUrl;
  }, [displayUrl]);

  const getResizedBlob = useCallback(async (src: string, w: number, h: number): Promise<Blob | null> => {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
    } catch { return null; }
  }, []);

  const handleSaveDimensions = useCallback(async () => {
    const src = processedUrl;
    if (!src || targetWidth <= 0 || targetHeight <= 0) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d")!;
    if (background.type === "color") {
      ctx.fillStyle = background.color || "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    if (background.filters) {
      const parts: string[] = [];
      const { brightness, contrast, saturation, shadow, opacity } = background.filters;
      if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
      if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
      if (saturation !== 100) parts.push(`saturate(${saturation}%)`);
      if (shadow && shadow > 0) parts.push(`drop-shadow(0 0 ${shadow}px rgba(0,0,0,${Math.min(1, shadow / 20)}))`);
      if (opacity !== undefined && opacity < 100) ctx.globalAlpha = opacity / 100;
      if (parts.length) ctx.filter = parts.join(" ");
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resized-${targetWidth}x${targetHeight}-${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [processedUrl, targetWidth, targetHeight, background, file]);

  const handleResetDimensions = useCallback(() => {
    setTargetWidthStr(String(origWidth));
    setTargetHeightStr(String(origHeight));
  }, [origWidth]);

  const handleDoneRefining = useCallback(async () => {
    const blob = await manualEdit.getResultBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(url);
    }
    setShowManualEditor(false);
  }, [manualEdit, processedUrl]);

  const getFinalResult = useCallback(async (): Promise<Blob | null> => {
    const useRefined = showManualEditor && manualEdit.canvasRef?.current;
    if (useRefined) {
      return manualEdit.getResultBlob();
    }
    if (!processedUrl) return null;
    const r = await fetch(processedUrl);
    return r.blob();
  }, [showManualEditor, manualEdit, processedUrl]);

  const handleDownloadPNG = async () => {
    const final = await getFinalResult();
    const src = final ? URL.createObjectURL(final) : null;
    if (!src) return;
    const blob = await fetch(src).then(r => r.blob());
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bg-removed-${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJPG = async () => {
    const final = await getFinalResult();
    const src = final ? URL.createObjectURL(final) : null;
    if (!src) return;
    try {
      const resp = await fetch(src);
      const blob = await resp.blob() as Blob;
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      const bgColor = background.type === "color" && background.color ? background.color : "#ffffff";
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      canvas.toBlob((jpgBlob) => {
        if (jpgBlob) {
          const url = URL.createObjectURL(jpgBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `bg-removed-${file?.name?.replace(/\.[^.]+$/, "") || "image"}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, "image/jpeg", 0.95);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const resetAll = () => {
    if (preview) URL.revokeObjectURL(preview);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    if (maskUrl) URL.revokeObjectURL(maskUrl);
    if (compositedUrl && compositedUrl !== processedUrl) URL.revokeObjectURL(compositedUrl);
    texts.forEach((t) => { /* cleanup if needed */ });
    setFile(null);
    setPreview(null);
    setProcessedUrl(null);
    setMaskUrl(null);
    setCompositedUrl(null);
    setError(null);
    setProcessingTime(null);
    setShowManualEditor(false);
    setCanvasZoom(1);
    setCanvasPanX(0);
    setCanvasPanY(0);
    setTexts([]);
    setSelectedTextId(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const srcUrl = processedUrl;
    const origUrl = preview;
    if (!srcUrl || !origUrl) return;
    if (compositeTimeoutRef.current) clearTimeout(compositeTimeoutRef.current);
    compositeTimeoutRef.current = setTimeout(async () => {
      const url = await compositeBackground(srcUrl, origUrl, background as any);
      setCompositedUrl(url);
    }, 80);
    return () => { if (compositeTimeoutRef.current) clearTimeout(compositeTimeoutRef.current); };
  }, [processedUrl, preview, background]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasPanMode) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, px: canvasPanX, py: canvasPanY };
  }, [canvasPanMode, canvasPanX, canvasPanY]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCanvasPanX(panStartRef.current.px + dx);
      setCanvasPanY(panStartRef.current.py + dy);
    }
  }, [isPanning]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  const handleCanvasWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 / 1.15 : 1.15;
      setCanvasZoom((z) => Math.min(5, Math.max(0.25, +(z * delta).toFixed(2))));
    }
  }, []);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleCanvasWheel);
  }, [handleCanvasWheel]);

  const zoomIn = () => setCanvasZoom((z) => Math.min(5, +(z * 1.3).toFixed(2)));
  const zoomOut = () => setCanvasZoom((z) => Math.max(0.25, +(z / 1.3).toFixed(2)));
  const zoomReset = () => { setCanvasZoom(1); setCanvasPanX(0); setCanvasPanY(0); };

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Background Remover</h1>
              <p className="text-muted-foreground">
                AI removes the background automatically. Refine manually with brush tools.
              </p>
            </div>
          </div>
        </motion.div>

        {!preview ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <ImageUpload onFileSelect={handleFileSelect} />
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {isProcessing && (
                <Card className="border-primary/20 overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center gap-1.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: progress < 100 ? "#8b5cf6" : "#22c55e",
                              animation: `progressBounce 1s ease-in-out infinite`,
                              animationDelay: `${i * 0.15}s`,
                              opacity: progress >= 100 ? 1 : undefined,
                            }}
                          />
                        ))}
                      </div>
                      <style>{`@keyframes progressBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
                      <AnimatedProgress value={progress} className="max-w-sm mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        AI is removing the background...
                        <br />
                        <span className="text-xs">First load downloads the high-precision AI model (~80MB, cached afterwards)</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isProcessing && displayUrl ? (
                <div
                  ref={canvasAreaRef}
                  className="relative rounded-xl overflow-hidden border bg-muted cursor-grab active:cursor-grabbing select-none"
                  style={{ minHeight: "400px" }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  <div
                    style={{
                      transform: `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoom})`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <div style={{
                      transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      ...(cropW > 0 && cropH > 0 && (cropX > 0 || cropY > 0 || cropW < origWidth || cropH < origHeight) ? {
                        clipPath: `inset(${(cropY / origHeight) * 100}% ${((origWidth - cropX - cropW) / origWidth) * 100}% ${((origHeight - cropY - cropH) / origHeight) * 100}% ${(cropX / origWidth) * 100}%)`
                      } : {}),
                    }}>
                      <BeforeAfter before={preview!} after={displayUrl as string}
                        containerStyle={dimensionActive ? { aspectRatio: `${targetWidth}/${targetHeight}` } : undefined} />
                      {photoBorder.enabled && (
                        <div className="absolute inset-0 pointer-events-none z-10"
                          style={{
                            borderRadius: photoBorder.shape === "circle" ? "50%" : photoBorder.shape === "rounded" ? `${photoBorder.radius}px` : "0",
                            border: `${photoBorder.width}px solid ${photoBorder.color}`,
                          }} />
                      )}
                      {showManualEditor && maskUrl && (
                        <canvas
                          ref={manualEdit.canvasCallbackRef}
                          className="absolute inset-0 w-full h-full"
                          style={{ touchAction: "none", cursor: `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(12, Math.min(32, manualEdit.brushSize / 2))}" height="${Math.max(12, Math.min(32, manualEdit.brushSize / 2))}" viewBox="0 0 ${Math.max(12, Math.min(32, manualEdit.brushSize / 2))} ${Math.max(12, Math.min(32, manualEdit.brushSize / 2))}"><circle cx="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" cy="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" r="${Math.max(5, Math.min(15, manualEdit.brushSize / 4))}" fill="none" stroke="white" stroke-width="1.5" opacity="0.8"/><line x1="${Math.max(6, Math.min(16, manualEdit.brushSize / 4)) - 3}" y1="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" x2="${Math.max(6, Math.min(16, manualEdit.brushSize / 4)) + 3}" y2="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" stroke="white" stroke-width="1" opacity="0.5"/><line x1="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" y1="${Math.max(6, Math.min(16, manualEdit.brushSize / 4)) - 3}" x2="${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}" y2="${Math.max(6, Math.min(16, manualEdit.brushSize / 4)) + 3}" stroke="white" stroke-width="1" opacity="0.5"/></svg>`)}") ${Math.max(6, Math.min(16, manualEdit.brushSize / 4))} ${Math.max(6, Math.min(16, manualEdit.brushSize / 4))}, crosshair` }}
                          onMouseDown={(e) => manualEdit.startDrawing(e.clientX, e.clientY)}
                          onMouseMove={(e) => { if (manualEdit.isDrawing) manualEdit.draw(e.clientX, e.clientY); }}
                          onMouseUp={manualEdit.stopDrawing}
                          onMouseLeave={manualEdit.stopDrawing}
                          onTouchStart={(e) => { const t = e.touches[0]; manualEdit.startDrawing(t.clientX, t.clientY); }}
                          onTouchMove={(e) => { const t = e.touches[0]; manualEdit.draw(t.clientX, t.clientY); }}
                          onTouchEnd={manualEdit.stopDrawing}
                        />
                      )}
                      {showCropOverlay && cropW > 0 && cropH > 0 && (
                        <div
                          className="absolute border-2 border-white/80 cursor-move"
                          style={{
                            left: `${(cropX / origWidth) * 100}%`,
                            top: `${(cropY / origHeight) * 100}%`,
                            width: `${(cropW / origWidth) * 100}%`,
                            height: `${(cropH / origHeight) * 100}%`,
                            boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.3)",
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation(); e.preventDefault();
                            setCropDragging(true);
                            setCropDragMode("move");
                            cropDragRef.current = { startX: e.clientX, startY: e.clientY, origX: cropX, origY: cropY, origW: cropW, origH: cropH };
                          }}
                        >
                          {["nw","n","ne","e","se","s","sw","w"].map((dir) => (
                            <div key={dir}
                              className="absolute w-3 h-3 bg-white border border-black rounded-sm"
                              style={{
                                cursor: `${dir}-resize`,
                                ...(dir.includes("n") ? { top: "-5px" } : dir.includes("s") ? { bottom: "-5px" } : { top: "calc(50% - 6px)" }),
                                ...(dir.includes("w") ? { left: "-5px" } : dir.includes("e") ? { right: "-5px" } : { left: "calc(50% - 6px)" }),
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation(); e.preventDefault();
                                setCropDragging(true);
                                setCropDragMode(dir as any);
                                cropDragRef.current = { startX: e.clientX, startY: e.clientY, origX: cropX, origY: cropY, origW: cropW, origH: cropH };
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {texts.map((t) => (
                        <div key={t.id}
                          className="absolute cursor-move select-none"
                          style={{
                            left: `${(t.x / origWidth) * 100}%`,
                            top: `${(t.y / origHeight) * 100}%`,
                            fontSize: `${(Math.max(1, t.fontSize) / origWidth) * 100}vw`,
                            fontFamily: t.fontFamily,
                            fontWeight: t.bold ? "bold" : "normal",
                            fontStyle: t.italic ? "italic" : "normal",
                            color: t.color,
                            textShadow: t.shadow ? `0 0 ${t.shadowBlur || 10}px rgba(0,0,0,0.5)` : "none",
                            outline: selectedTextId === t.id ? "2px dashed #3b82f6" : "none",
                            transform: `rotate(${t.rotation}deg)`,
                            maxWidth: "80%",
                            overflow: "hidden",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            opacity: (t.opacity ?? 100) / 100,
                            backgroundColor: (t.bgColor && t.bgColor !== "transparent") ? t.bgColor : "transparent",
                            padding: t.bgColor && t.bgColor !== "transparent" ? "4px 8px" : "0",
                            borderRadius: t.bgColor && t.bgColor !== "transparent" ? "4px" : "0",
                            WebkitTextStroke: t.outline ? `${Math.max(1, t.fontSize * 0.05)}px rgba(0,0,0,0.5)` : "0",
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedTextId(t.id);
                            setShowTextOverlay(true);
                            textDragRef.current = { id: t.id, startX: e.clientX, startY: e.clientY, origX: t.x, origY: t.y };
                            setTextDragging(true);
                          }}
                        >
                          {t.content}
                          {selectedTextId === t.id && (
                            <>
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-primary rounded-sm cursor-nw-resize"
                                onMouseDown={(e) => { e.stopPropagation(); }} />
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-primary rounded-sm cursor-ne-resize"
                                onMouseDown={(e) => { e.stopPropagation(); }} />
                              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-primary rounded-sm cursor-sw-resize"
                                onMouseDown={(e) => { e.stopPropagation(); }} />
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-primary rounded-sm cursor-se-resize"
                                onMouseDown={(e) => { e.stopPropagation(); }} />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {textDragging && textDragRef.current && (
                      <div
                        className="absolute inset-0 z-50"
                        onMouseMove={(e) => {
                          const d = textDragRef.current;
                          if (!d) return;
                          const dx = (e.clientX - d.startX) / origWidth * 100;
                          const dy = (e.clientY - d.startY) / origHeight * 100;
                          setTexts((prev) => prev.map((t) =>
                            t.id === d.id ? { ...t, x: Math.max(0, d.origX + (e.clientX - d.startX)), y: Math.max(0, d.origY + (e.clientY - d.startY)) } : t
                          ));
                        }}
                        onMouseUp={() => { setTextDragging(false); textDragRef.current = null; }}
                        onMouseLeave={() => { setTextDragging(false); textDragRef.current = null; }}
                      />
                    )}
                    {cropDragging && cropDragRef.current && (
                      <div
                        className="absolute inset-0 z-50"
                        onMouseMove={(e) => {
                          const d = cropDragRef.current;
                          if (!d) return;
                          const dx = (e.clientX - d.startX) / origWidth * 100;
                          const dy = (e.clientY - d.startY) / origHeight * 100;
                          const moveX = (e.clientX - d.startX);
                          const moveY = (e.clientY - d.startY);
                          const scaleX = origWidth / 100;
                          const scaleY = origHeight / 100;
                          if (cropDragMode === "move") {
                            setCropX(Math.max(0, d.origX + moveX));
                            setCropY(Math.max(0, d.origY + moveY));
                          } else if (cropDragMode === "se") {
                            setCropW(Math.max(10, d.origW + moveX));
                            setCropH(Math.max(10, d.origH + moveY));
                          } else if (cropDragMode === "e") {
                            setCropW(Math.max(10, d.origW + moveX));
                          } else if (cropDragMode === "s") {
                            setCropH(Math.max(10, d.origH + moveY));
                          } else if (cropDragMode === "n") {
                            const newH = d.origH - moveY;
                            if (newH > 10) { setCropY(d.origY + moveY); setCropH(newH); }
                          } else if (cropDragMode === "w") {
                            const newW = d.origW - moveX;
                            if (newW > 10) { setCropX(d.origX + moveX); setCropW(newW); }
                          } else if (cropDragMode === "ne") {
                            const newH = d.origH - moveY;
                            if (newH > 10) { setCropY(d.origY + moveY); setCropH(newH); }
                            setCropW(Math.max(10, d.origW + moveX));
                          } else if (cropDragMode === "nw") {
                            const newW = d.origW - moveX;
                            const newH = d.origH - moveY;
                            if (newW > 10) { setCropX(d.origX + moveX); setCropW(newW); }
                            if (newH > 10) { setCropY(d.origY + moveY); setCropH(newH); }
                          } else if (cropDragMode === "sw") {
                            const newW = d.origW - moveX;
                            if (newW > 10) { setCropX(d.origX + moveX); setCropW(newW); }
                            setCropH(Math.max(10, d.origH + moveY));
                          }
                        }}
                        onMouseUp={() => { setCropDragging(false); cropDragRef.current = null; }}
                        onMouseLeave={() => { setCropDragging(false); cropDragRef.current = null; }}
                      />
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button type="button" onClick={() => setCanvasPanMode((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${canvasPanMode ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Pan">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 2 2v4.6A4.4 4.4 0 0 1 15.6 19h-2.2a6 6 0 0 1-4.22-1.78l-3.15-3.16a1.5 1.5 0 0 1 0-2.12l.1-.1A1.5 1.5 0 0 1 7.8 12.2L10 14"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowSubjectOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showSubjectOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Subject Adjustments">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="14" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="16" r="2"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowDimOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showDimOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Dimensions">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 6.5-3 3"/><path d="m10 11-3 3"/><path d="m16.5 9.5-3 3"/><path d="m6 16.5-2.3 2.3"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowBgOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showBgOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Background">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><path d="m3 16 4.5-4.5a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 0 1.4 0L16 12.5a1 1 0 0 1 1.4 0L21 17"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowManualOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showManualOverlay || showManualEditor ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Manual Refine">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 5-2-2H7l-4 4 9 9 10-10Z"/><path d="m5 16 5 5"/><path d="M16 10v6"/><path d="M10 16h6"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowCropOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showCropOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Crop">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
                    </button>
                    <button type="button" onClick={() => setFlipH((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${flipH ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Flip Horizontal">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v10"/><path d="M21 7v10"/><path d="M12 21V3"/><path d="m8 17 4 4 4-4"/><path d="m8 7 4-4 4 4"/></svg>
                    </button>
                    <button type="button" onClick={() => setFlipV((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${flipV ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Flip Vertical">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10"/><path d="M7 21h10"/><path d="M3 12h18"/><path d="m7 8-4 4 4 4"/><path d="m17 8 4 4-4 4"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowBorderOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${showBorderOverlay || photoBorder.enabled ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Photo Border">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><rect width="16" height="16" x="4" y="4" rx="1"/></svg>
                    </button>
                  </div>

                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                    <button type="button" onClick={zoomOut}
                      className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
                      title="Zoom out">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button type="button" onClick={zoomReset}
                      className="h-7 px-2 flex items-center justify-center rounded bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-colors min-w-[48px]"
                      title="Reset zoom">
                      {Math.round(canvasZoom * 100)}%
                    </button>
                    <button type="button" onClick={zoomIn}
                      className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
                      title="Zoom in">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>

                  {showSubjectOverlay && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <SubjectAdjustments current={background} onChange={setBackground} />
                    </div>
                  )}
                  {showDimOverlay && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <div className="flex gap-2 items-center mb-3">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Width</Label>
                          <Input type="number" value={targetWidthStr}
                            onChange={(e) => setTargetWidthStr(e.target.value)} />
                        </div>
                        <span className="text-muted-foreground mt-5">×</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Height</Label>
                          <Input type="number" value={targetHeightStr}
                            onChange={(e) => setTargetHeightStr(e.target.value)} />
                        </div>
                        <div className="w-16 mt-5">
                          <select value={dimensionUnit}
                            onChange={(e) => setDimensionUnit(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                            <option value="px">px</option>
                            <option value="in">in</option>
                            <option value="cm">cm</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="flex-1" onClick={handleSaveDimensions} disabled={!targetWidthStr || !targetHeightStr}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={handleResetDimensions}>
                          Reset
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-2">
                        Original: {origWidth} × {origHeight}px
                      </p>
                    </div>
                  )}
                  {showBgOverlay && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <BackgroundEditor current={background} onChange={setBackground} />
                    </div>
                  )}
                  {(showManualOverlay || showManualEditor) && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Brush</span>
                          {showManualEditor ? (
                            <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleDoneRefining}>
                              Done
                            </Button>
                          ) : (
                            <Button variant="default" size="sm" className="h-7 text-xs"
                              onClick={() => setShowManualEditor(true)}>
                              Start
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant={manualEdit.brushMode === "erase" ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => manualEdit.setBrushMode("erase")}>Erase</Button>
                          <Button size="sm" variant={manualEdit.brushMode === "restore" ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => manualEdit.setBrushMode("restore")}>Restore</Button>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Size: {manualEdit.brushSize}px</span>
                          <input type="range" min={5} max={100} value={manualEdit.brushSize}
                            onChange={(e) => manualEdit.setBrushSize(Number(e.target.value))}
                            className="w-full h-1.5 accent-primary" />
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={manualEdit.undoLastStroke}>Undo</Button>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={manualEdit.redoLastStroke}>Redo</Button>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={manualEdit.resetMask}>Reset</Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {showCropOverlay && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-56">
                      <div className="space-y-3">
                        <span className="text-sm font-semibold">Crop</span>
                        <p className="text-[10px] text-muted-foreground">Drag the handles on the image to crop.</p>
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs"
                          onClick={() => { setCropX(0); setCropY(0); setCropW(origWidth); setCropH(origHeight); }}>
                          Reset
                        </Button>
                      </div>
                    </div>
                  )}
                  {showBorderOverlay && (
                    <div className="absolute top-12 right-3 bg-background border rounded-xl shadow-xl p-4 z-20 w-64">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Photo Border</span>
                          <Button size="sm" variant={photoBorder.enabled ? "default" : "outline"} className="h-7 text-xs"
                            onClick={() => setPhotoBorder((p) => ({ ...p, enabled: !p.enabled }))}>
                            {photoBorder.enabled ? "On" : "Off"}
                          </Button>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Width: {photoBorder.width}px</span>
                          <input type="range" min={1} max={50} value={photoBorder.width}
                            onChange={(e) => setPhotoBorder((p) => ({ ...p, width: Number(e.target.value) }))}
                            className="w-full h-1.5 accent-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Color</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Input type="color" value={photoBorder.color}
                              onChange={(e) => setPhotoBorder((p) => ({ ...p, color: e.target.value }))}
                              className="w-10 h-8 p-0.5 cursor-pointer" />
                            <Input value={photoBorder.color}
                              onChange={(e) => setPhotoBorder((p) => ({ ...p, color: e.target.value }))}
                              className="flex-1 h-8 font-mono text-xs" />
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Shape</span>
                          <select value={photoBorder.shape}
                            onChange={(e) => setPhotoBorder((p) => ({ ...p, shape: e.target.value as any }))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs mt-1">
                            <option value="rectangle">Rectangle</option>
                            <option value="rounded">Rounded</option>
                            <option value="circle">Circle</option>
                          </select>
                        </div>
                        {photoBorder.shape === "rounded" && (
                          <div>
                            <span className="text-[10px] text-muted-foreground">Radius: {photoBorder.radius}px</span>
                            <input type="range" min={0} max={50} value={photoBorder.radius}
                              onChange={(e) => setPhotoBorder((p) => ({ ...p, radius: Number(e.target.value) }))}
                              className="w-full h-1.5 accent-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {showTextOverlay && selectedTextId && texts.find((t) => t.id === selectedTextId) && (
                    <div ref={textPanelRef}
                      className="absolute bg-background border rounded-xl shadow-xl p-4 z-20 w-64 max-h-[80vh] overflow-y-auto"
                      style={{ top: `calc(12px + ${textPanelOffset.y}px)`, right: `calc(12px + ${-textPanelOffset.x}px)` }}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between cursor-move"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            textPanelDragRef.current = { startX: e.clientX, startY: e.clientY, origX: textPanelOffset.x, origY: textPanelOffset.y };
                            const handleMouseMove2 = (ev: MouseEvent) => {
                              if (!textPanelDragRef.current) return;
                              setTextPanelOffset({
                                x: textPanelDragRef.current.origX + (ev.clientX - textPanelDragRef.current.startX),
                                y: textPanelDragRef.current.origY + (ev.clientY - textPanelDragRef.current.startY),
                              });
                            };
                            const handleMouseUp2 = () => {
                              textPanelDragRef.current = null;
                              window.removeEventListener("mousemove", handleMouseMove2);
                              window.removeEventListener("mouseup", handleMouseUp2);
                            };
                            window.addEventListener("mousemove", handleMouseMove2);
                            window.addEventListener("mouseup", handleMouseUp2);
                          }}>
                          <span className="text-sm font-semibold">Text</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs"
                            onClick={() => { setSelectedTextId(null); setShowTextOverlay(false); }}>✕</Button>
                        </div>
                        <Input value={(texts.find((t) => t.id === selectedTextId)?.content) || ""}
                          onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, content: e.target.value } : t))}
                          className="h-8 text-xs" placeholder="Type here..." />
                        <div className="flex gap-1">
                          <Button size="sm" variant={(texts.find((t) => t.id === selectedTextId)?.bold) ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, bold: !t.bold } : t))}>
                            <span className="font-bold">B</span>
                          </Button>
                          <Button size="sm" variant={(texts.find((t) => t.id === selectedTextId)?.italic) ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, italic: !t.italic } : t))}>
                            <span className="italic">I</span>
                          </Button>
                          <Button size="sm" variant={(texts.find((t) => t.id === selectedTextId)?.outline) ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, outline: !t.outline } : t))}>
                            <span style={{ WebkitTextStroke: "1px currentColor" }}>S</span>
                          </Button>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Font</span>
                          <select value={(texts.find((t) => t.id === selectedTextId)?.fontFamily) || "Arial"}
                            onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, fontFamily: e.target.value } : t))}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                            <option value="Arial">Arial</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Impact">Impact</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Size</span>
                          <Input type="number" value={textSizeInputValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTextSizeInputValue(val);
                              if (val !== "") {
                                const n = Number(val);
                                if (!isNaN(n)) {
                                  setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, fontSize: Math.max(8, Math.round(n)) } : t));
                                }
                              }
                            }}
                            className="h-8 text-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Color</span>
                          <Input type="color" value={(texts.find((t) => t.id === selectedTextId)?.color) || "#ffffff"}
                            onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, color: e.target.value } : t))}
                            className="w-10 h-8 p-0.5 cursor-pointer" />
                          <span className="text-[10px] font-mono">{(texts.find((t) => t.id === selectedTextId)?.color) || "#ffffff"}</span>
                          {texts.find((t) => t.id === selectedTextId)?.shadow && (
                            <button type="button" onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, shadow: !t.shadow } : t))}
                              className="h-7 text-xs ml-auto">✕</button>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant={(texts.find((t) => t.id === selectedTextId)?.shadow) ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, shadow: !t.shadow, shadowBlur: t.shadow ? t.shadowBlur : 10 } : t))}>
                            Shadow
                          </Button>
                          <Button size="sm" variant={(texts.find((t) => t.id === selectedTextId)?.bgColor && texts.find((t) => t.id === selectedTextId)?.bgColor !== "transparent") ? "default" : "outline"}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, bgColor: t.bgColor && t.bgColor !== "transparent" ? "transparent" : "rgba(0,0,0,0.5)" } : t))}>
                            BG
                          </Button>
                        </div>
                        {texts.find((t) => t.id === selectedTextId)?.shadow && (
                          <div>
                            <span className="text-[10px] text-muted-foreground">Shadow Blur: {(texts.find((t) => t.id === selectedTextId)?.shadowBlur) || 10}px</span>
                            <input type="range" min={0} max={100} value={(texts.find((t) => t.id === selectedTextId)?.shadowBlur) || 10}
                              onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, shadowBlur: Number(e.target.value) } : t))}
                              className="w-full h-1.5 accent-primary" />
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-muted-foreground">Opacity: {(texts.find((t) => t.id === selectedTextId)?.opacity ?? 100)}%</span>
                          <input type="range" min={0} max={100} value={(texts.find((t) => t.id === selectedTextId)?.opacity ?? 100)}
                            onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, opacity: Number(e.target.value) } : t))}
                            className="w-full h-1.5 accent-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Background</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Input type="color" value={(() => { const bg = texts.find(t => t.id === selectedTextId)?.bgColor; return bg && bg !== "transparent" ? bg : "#000000"; })()}
                              onChange={(e) => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, bgColor: e.target.value } : t))}
                              className="w-10 h-8 p-0.5 cursor-pointer" />
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => setTexts((prev) => prev.map((t) => t.id === selectedTextId ? { ...t, bgColor: "transparent" } : t))}>
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setTexts((prev) => {
                                const t = prev.find(t => t.id === selectedTextId);
                                if (!t) return prev;
                                const idx = prev.indexOf(t);
                                const newTexts = [...prev];
                                newTexts[idx] = { ...t, rotation: (t.rotation || 0) - 15 };
                                return newTexts;
                              });
                            }}>-15°</Button>
                          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setTexts((prev) => {
                                const t = prev.find(t => t.id === selectedTextId);
                                if (!t) return prev;
                                const idx = prev.indexOf(t);
                                const newTexts = [...prev];
                                newTexts[idx] = { ...t, rotation: (t.rotation || 0) + 15 };
                                return newTexts;
                              });
                            }}>+15°</Button>
                        </div>
                        <Button size="sm" variant="destructive" className="w-full h-7 text-xs"
                          onClick={() => { setTexts((prev) => prev.filter((t) => t.id !== selectedTextId)); setSelectedTextId(null); setShowTextOverlay(false); }}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {!isProcessing && !processedUrl && (
                <Card>
                  <CardContent className="p-6">
                    <div className="relative rounded-xl overflow-hidden">
                      <img
                        src={preview!}
                        alt="Uploaded"
                        className="w-full max-h-[500px] object-contain bg-muted"
                      />
                      <div className="absolute bottom-3 left-3">
                        <Badge variant="secondary" className="gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Original
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card className="border-destructive/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </CardContent>
                </Card>
              )}

              {processingTime && !showManualEditor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Processed in {(processingTime / 1000).toFixed(1)}s
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-2" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <style>{`@keyframes buttonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
                    <Button
                      onClick={handleRemoveBackground}
                      disabled={isProcessing}
                      className={`w-full text-white shadow-lg relative overflow-hidden ${isProcessing ? "border-0" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}
                      size="lg"
                    >
                      {isProcessing ? (
                        <div className="absolute inset-0 flex items-center justify-center z-10 gap-2">
                          <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                                style={{ animation: `progressBounce 0.8s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> AI Remove Background</span>
                      )}
                      {isProcessing && (
                        <div
                          className="absolute inset-0 h-full"
                          style={{
                            width: `${Math.max(5, progress)}%`,
                            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
                            backgroundSize: "200% 100%",
                            animation: "buttonShimmer 2s linear infinite",
                            transition: "width 0.5s ease-out",
                          }}
                        />
                      )}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {processedUrl && !isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2"
                      >
                        <Button
                          onClick={showManualEditor ? handleDoneRefining : () => setShowManualEditor(true)}
                          variant={showManualEditor ? "default" : "outline"}
                          className="w-full gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          {showManualEditor ? "Done Refining" : "Manual Refine"}
                        </Button>

                        <Button
                          onClick={() => {
                            const newId = generateId();
                            setTexts((prev) => [...prev, {
                              id: newId, content: "Text", x: 50, y: 50,
                              fontSize: 36, fontFamily: "Arial", bold: false, italic: false,
                              color: "#ffffff", shadow: false, shadowBlur: 10, rotation: 0, width: 200, height: 50,
                              opacity: 100, bgColor: "transparent", outline: false,
                            }]);
                            setSelectedTextId(newId);
                            setShowTextOverlay(true);
                          }}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                          Add Text
                        </Button>

                        <div className="relative" ref={downloadRef}>
                          <Button
                            onClick={() => setDownloadOpen(!downloadOpen)}
                            variant="outline"
                            className="w-full gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                            <ChevronDown className="h-3 w-3 ml-auto" />
                          </Button>
                          {downloadOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-background shadow-lg overflow-hidden z-50">
                              <button
                                onClick={() => { handleDownloadPNG(); setDownloadOpen(false); }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                              >
                                <Download className="h-3.5 w-3.5" />
                                PNG (Transparent)
                              </button>
                              <button
                                onClick={() => { handleDownloadJPG(); setDownloadOpen(false); }}
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                              >
                                <Download className="h-3.5 w-3.5" />
                                JPG (White BG)
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {preview && (
                    <Button
                      onClick={resetAll}
                      variant="ghost"
                      className="w-full"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Upload Different Image
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
