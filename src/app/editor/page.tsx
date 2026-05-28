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
import { BackgroundOptions } from "@/types";
import { compositeBackground, createMaskFromTransparent } from "@/lib/utils";
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
    filters: { brightness: 100, contrast: 100, saturation: 100 },
  });
  const { processFile, isProcessing, progress } = useBackgroundRemoval();
  const { toast } = useToast();
  const compositeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [showSubjectOverlay, setShowSubjectOverlay] = useState(false);
  const [showDimOverlay, setShowDimOverlay] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const [targetWidthStr, setTargetWidthStr] = useState("");
  const [targetHeightStr, setTargetHeightStr] = useState("");
  const [origWidth, setOrigWidth] = useState(0);
  const [origHeight, setOrigHeight] = useState(0);
  const [dimensionUnit, setDimensionUnit] = useState<"px" | "in" | "cm" | "ft">("px");
  const [resizedUrl, setResizedUrl] = useState<string | null>(null);

  const targetWidth = targetWidthStr === "" ? 0 : Number(targetWidthStr);
  const targetHeight = targetHeightStr === "" ? 0 : Number(targetHeightStr);

  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPanX, setCanvasPanX] = useState(0);
  const [canvasPanY, setCanvasPanY] = useState(0);
  const [canvasPanMode, setCanvasPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const dimTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [dimPreviewUrl, setDimPreviewUrl] = useState<string | null>(null);

  useEffect(() => { preloadModel(); }, []);

  const manualEdit = useManualEdit({
    imageUrl: preview,
    maskUrl,
  });

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

  const dimSourceUrl = useMemo(() => {
    return resizedUrl || compositedUrl || processedUrl;
  }, [resizedUrl, compositedUrl, processedUrl]);

  const displayUrl = useMemo(() => {
    return dimPreviewUrl || dimSourceUrl;
  }, [dimPreviewUrl, dimSourceUrl]);

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

  useEffect(() => {
    const src = dimSourceUrl;
    if (!src || targetWidth <= 0 || targetHeight <= 0) {
      setDimPreviewUrl(null);
      return;
    }
    if (dimTimeoutRef.current) clearTimeout(dimTimeoutRef.current);
    dimTimeoutRef.current = setTimeout(async () => {
      const blob = await getResizedBlob(src, targetWidth, targetHeight);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setDimPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      }
    }, 350);
    return () => { if (dimTimeoutRef.current) clearTimeout(dimTimeoutRef.current); };
  }, [targetWidth, targetHeight, dimSourceUrl, getResizedBlob]);

  useEffect(() => {
    if (!displayUrl) return;
    const img = new Image();
    img.onload = () => {
      setOrigWidth(img.naturalWidth);
      setOrigHeight(img.naturalHeight);
      if (targetWidthStr === "") {
        setTargetWidthStr(String(img.naturalWidth));
        setTargetHeightStr(String(img.naturalHeight));
      }
    };
    img.src = displayUrl;
  }, [displayUrl]);

  const handleSaveDimensions = useCallback(async () => {
    const src = dimSourceUrl;
    if (!src || targetWidth <= 0 || targetHeight <= 0) return;
    const blob = await getResizedBlob(src, targetWidth, targetHeight);
    if (!blob) return;
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    const url = URL.createObjectURL(blob);
    setResizedUrl(url);
    setDimPreviewUrl(null);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resized-${targetWidth}x${targetHeight}-${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
    link.click();
  }, [dimSourceUrl, targetWidth, targetHeight, resizedUrl, getResizedBlob, file]);

  const handleResetDimensions = useCallback(() => {
    setTargetWidthStr(String(origWidth));
    setTargetHeightStr(String(origHeight));
    setResizedUrl(null);
    setDimPreviewUrl(null);
    if (dimTimeoutRef.current) clearTimeout(dimTimeoutRef.current);
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
    const src = resizedUrl || (final ? URL.createObjectURL(final) : null);
    if (!src) return;
    const blob = src.startsWith("blob:") ? await fetch(src).then(r => r.blob()) : final;
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
    const src = resizedUrl || (final ? URL.createObjectURL(final) : null);
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
    if (resizedUrl) URL.revokeObjectURL(resizedUrl);
    if (dimPreviewUrl) URL.revokeObjectURL(dimPreviewUrl);
    setFile(null);
    setPreview(null);
    setProcessedUrl(null);
    setMaskUrl(null);
    setCompositedUrl(null);
    setResizedUrl(null);
    setDimPreviewUrl(null);
    setError(null);
    setProcessingTime(null);
    setShowManualEditor(false);
    setCanvasZoom(1);
    setCanvasPanX(0);
    setCanvasPanY(0);
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
    <div className="h-screen flex flex-col">
      <div className="flex-1 container max-w-7xl flex flex-col py-3">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">Bg Remover</h1>
        </div>

        {!preview ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto mt-8"
          >
            <ImageUpload onFileSelect={handleFileSelect} />
          </motion.div>
        ) : (
          <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
            <div className="lg:col-span-2 relative flex flex-col min-h-0">
              {isProcessing && (
                <Card className="border-primary/20 overflow-hidden">
                  <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <div className="flex justify-center gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-purple-500"
                            style={{ animation: `bounce 0.8s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
                      <AnimatedProgress value={progress} className="max-w-xs mx-auto h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        AI removing background...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showManualEditor && maskUrl && preview ? (
                <ManualEditor
                  canvasRef={manualEdit.canvasRef}
                  canvasCallbackRef={manualEdit.canvasCallbackRef}
                  isDrawing={manualEdit.isDrawing}
                  brushSize={manualEdit.brushSize}
                  brushMode={manualEdit.brushMode}
                  onBrushSizeChange={manualEdit.setBrushSize}
                  onBrushModeChange={manualEdit.setBrushMode}
                  onReset={manualEdit.resetMask}
                  onUndo={manualEdit.undoLastStroke}
                  onMouseDown={(x, y) => manualEdit.startDrawing(x, y)}
                  onMouseMove={(x, y) => manualEdit.draw(x, y)}
                  onMouseUp={manualEdit.stopDrawing}
                  onTouchStart={(e) => { const t = e.touches[0]; manualEdit.startDrawing(t.clientX, t.clientY); }}
                  onTouchMove={(e) => { const t = e.touches[0]; manualEdit.draw(t.clientX, t.clientY); }}
                  onTouchEnd={manualEdit.stopDrawing}
                />
              ) : null}

              {!isProcessing && !showManualEditor && displayUrl ? (
                <div
                  ref={canvasAreaRef}
                  className="relative flex-1 rounded-xl overflow-hidden border bg-muted cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  <div
                    style={{
                      transform: `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoom})`,
                      transformOrigin: "0 0",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <BeforeAfter before={preview!} after={displayUrl as string} className="w-full h-full [&>div]:!aspect-auto [&>div]:!h-full" />
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button type="button" onClick={() => setCanvasPanMode((p) => !p)}
                      className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs transition-colors ${canvasPanMode ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Pan">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 2 2v4.6A4.4 4.4 0 0 1 15.6 19h-2.2a6 6 0 0 1-4.22-1.78l-3.15-3.16a1.5 1.5 0 0 1 0-2.12l.1-.1A1.5 1.5 0 0 1 7.8 12.2L10 14"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowSubjectOverlay((p) => !p)}
                      className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs transition-colors ${showSubjectOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Subject Adjustments">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="14" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="16" r="2"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowDimOverlay((p) => !p)}
                      className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs transition-colors ${showDimOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Dimensions">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 6.5-3 3"/><path d="m10 11-3 3"/><path d="m16.5 9.5-3 3"/><path d="m6 16.5-2.3 2.3"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowBgOverlay((p) => !p)}
                      className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs transition-colors ${showBgOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"}`}
                      title="Background">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><path d="m3 16 4.5-4.5a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 0 1.4 0L16 12.5a1 1 0 0 1 1.4 0L21 17"/></svg>
                    </button>
                  </div>

                  <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
                    <button type="button" onClick={zoomOut}
                      className="w-6 h-6 flex items-center justify-center rounded bg-black/50 text-white text-xs hover:bg-black/70 transition-colors"
                      title="Zoom out">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <button type="button" onClick={zoomReset}
                      className="h-6 px-1.5 flex items-center justify-center rounded bg-black/50 text-white text-[10px] font-medium hover:bg-black/70 transition-colors min-w-[36px]"
                      title="Reset zoom">
                      {Math.round(canvasZoom * 100)}%
                    </button>
                    <button type="button" onClick={zoomIn}
                      className="w-6 h-6 flex items-center justify-center rounded bg-black/50 text-white text-xs hover:bg-black/70 transition-colors"
                      title="Zoom in">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>

                  {showSubjectOverlay && (
                    <div className="absolute top-10 right-2 bg-background border rounded-lg shadow-lg p-3 z-20 w-56">
                      <SubjectAdjustments current={background} onChange={setBackground} />
                    </div>
                  )}
                  {showDimOverlay && (
                    <div className="absolute top-10 right-2 bg-background border rounded-lg shadow-lg p-3 z-20 w-56">
                      <div className="flex gap-1.5 items-center mb-2">
                        <div className="flex-1">
                          <span className="text-[10px] text-muted-foreground">W</span>
                          <Input type="number" value={targetWidthStr}
                            onChange={(e) => setTargetWidthStr(e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <span className="text-muted-foreground mt-4">×</span>
                        <div className="flex-1">
                          <span className="text-[10px] text-muted-foreground">H</span>
                          <Input type="number" value={targetHeightStr}
                            onChange={(e) => setTargetHeightStr(e.target.value)}
                            className="h-7 text-xs" />
                        </div>
                        <div className="w-14 mt-4">
                          <select value={dimensionUnit}
                            onChange={(e) => setDimensionUnit(e.target.value as any)}
                            className="flex h-7 w-full rounded border border-input bg-background px-1 text-[10px]">
                            <option value="px">px</option>
                            <option value="in">in</option>
                            <option value="cm">cm</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={handleSaveDimensions} disabled={!targetWidthStr || !targetHeightStr}>
                          <Download className="h-3 w-3" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={handleResetDimensions}>
                          Reset
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic mt-1.5">
                        Orig: {origWidth}×{origHeight}px · Drag pan · Ctrl+Scroll zoom
                      </p>
                    </div>
                  )}
                  {showBgOverlay && (
                    <div className="absolute top-10 right-2 bg-background border rounded-lg shadow-lg p-3 z-20 w-56">
                      <BackgroundEditor current={background} onChange={setBackground} />
                    </div>
                  )}
                </div>
              ) : null}

              {!isProcessing && !processedUrl && (
                <div className="relative flex-1 rounded-xl overflow-hidden border bg-muted flex items-center justify-center">
                  <img src={preview!} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-[10px] gap-0.5 h-5">
                      <ImageIcon className="h-2.5 w-2.5" /> Original
                    </Badge>
                  </div>
                </div>
              )}

              {processingTime && !showManualEditor && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {(processingTime / 1000).toFixed(1)}s
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-1" />
                </div>
              )}
            </div>

            <div className="space-y-3 overflow-y-auto min-h-0">
              <Card className="shadow-sm">
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-xs font-semibold">Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <Button onClick={handleRemoveBackground} disabled={isProcessing}
                    className={`w-full text-white shadow-sm relative overflow-hidden h-8 text-xs ${isProcessing ? "" : "bg-gradient-to-r from-blue-500 to-purple-500"}`}
                    size="sm">
                    {isProcessing ? (
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> {progress}%</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Remove BG</span>
                    )}
                  </Button>

                  <AnimatePresence>
                    {processedUrl && !isProcessing && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-1.5">
                        <Button onClick={showManualEditor ? handleDoneRefining : () => setShowManualEditor(true)}
                          variant={showManualEditor ? "default" : "outline"} className="w-full gap-1.5 h-7 text-xs">
                          <ImageIcon className="h-3 w-3" />
                          {showManualEditor ? "Done Refining" : "Manual Refine"}
                        </Button>

                        <div className="relative" ref={downloadRef}>
                          <Button onClick={() => setDownloadOpen(!downloadOpen)} variant="outline" className="w-full gap-1.5 h-7 text-xs">
                            <Download className="h-3 w-3" /> Download <ChevronDown className="h-2.5 w-2.5 ml-auto" />
                          </Button>
                          {downloadOpen && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 rounded border bg-background shadow-lg overflow-hidden z-50">
                              <button onClick={() => { handleDownloadPNG(); setDownloadOpen(false); }}
                                className="w-full px-2 py-1.5 text-[10px] text-left hover:bg-muted flex items-center gap-1.5">
                                <Download className="h-2.5 w-2.5" /> PNG (Transparent)
                              </button>
                              <button onClick={() => { handleDownloadJPG(); setDownloadOpen(false); }}
                                className="w-full px-2 py-1.5 text-[10px] text-left hover:bg-muted flex items-center gap-1.5">
                                <Download className="h-2.5 w-2.5" /> JPG (White BG)
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {preview && (
                    <Button onClick={resetAll} variant="ghost" className="w-full h-7 text-xs">
                      <ArrowLeft className="mr-1 h-3 w-3" /> New Image
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
