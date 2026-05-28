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
    return resizedUrl || compositedUrl || processedUrl;
  }, [resizedUrl, compositedUrl, processedUrl]);

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
    const src = compositedUrl || processedUrl;
    if (!src || targetWidth <= 0 || targetHeight <= 0) return;
    try {
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
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((blob) => {
        if (blob) {
          if (resizedUrl) URL.revokeObjectURL(resizedUrl);
          const url = URL.createObjectURL(blob);
          setResizedUrl(url);
        }
      }, "image/png");
    } catch { /* ignore */ }
  }, [compositedUrl, processedUrl, targetWidth, targetHeight, resizedUrl]);

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
    const blob = await getFinalResult();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bg-removed-${file?.name?.replace(/\.[^.]+$/, "") || "image"}.png`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJPG = async () => {
    const blob = await getFinalResult();
    if (!blob) return;
    try {
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
    setFile(null);
    setPreview(null);
    setProcessedUrl(null);
    setMaskUrl(null);
    setCompositedUrl(null);
    setError(null);
    setProcessingTime(null);
    setShowManualEditor(false);
  };

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
                  onTouchStart={(e) => {
                    const t = e.touches[0];
                    manualEdit.startDrawing(t.clientX, t.clientY);
                  }}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    manualEdit.draw(t.clientX, t.clientY);
                  }}
                  onTouchEnd={manualEdit.stopDrawing}
                />
              ) : null}

              {!isProcessing && !showManualEditor && displayUrl ? (
                <div className="relative">
                  <BeforeAfter before={preview!} after={displayUrl as string} />
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    <button
                      type="button"
                      onClick={() => setShowSubjectOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${
                        showSubjectOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"
                      }`}
                      title="Subject Adjustments"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="14" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="16" r="2"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDimOverlay((p) => !p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${
                        showDimOverlay ? "bg-primary" : "bg-black/50 hover:bg-black/70"
                      }`}
                      title="Dimensions"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 6.5-3 3"/><path d="m10 11-3 3"/><path d="m16.5 9.5-3 3"/><path d="m6 16.5-2.3 2.3"/></svg>
                    </button>
                  </div>
                  {showSubjectOverlay && (
                    <div className="absolute top-10 right-2 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <SubjectAdjustments current={background} onChange={setBackground} />
                    </div>
                  )}
                  {showDimOverlay && (
                    <div className="absolute top-10 right-2 bg-background border rounded-xl shadow-xl p-4 z-20 w-72">
                      <div className="flex gap-2 items-center mb-3">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Width</Label>
                          <Input
                            type="number"
                            value={targetWidthStr}
                            onChange={(e) => setTargetWidthStr(e.target.value)}
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">×</span>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Height</Label>
                          <Input
                            type="number"
                            value={targetHeightStr}
                            onChange={(e) => setTargetHeightStr(e.target.value)}
                          />
                        </div>
                        <div className="w-16 mt-5">
                          <select
                            value={dimensionUnit}
                            onChange={(e) => setDimensionUnit(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
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
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { setTargetWidthStr(String(origWidth)); setTargetHeightStr(String(origHeight)); }}>
                          Reset
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-2">
                        Original: {origWidth} × {origHeight}px
                      </p>
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

              {displayUrl && !isProcessing && !showManualEditor && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Background</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BackgroundEditor
                      current={background}
                      onChange={setBackground}
                    />
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
