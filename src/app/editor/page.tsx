"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/features/ImageUpload";
import { BeforeAfter } from "@/components/features/BeforeAfter";
import { ManualEditor } from "@/components/features/ManualEditor";
import { BackgroundEditor } from "@/components/features/BackgroundEditor";
import { AnimatedProgress } from "@/components/features/AnimatedProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    return compositedUrl || processedUrl;
  }, [compositedUrl, processedUrl]);

  useEffect(() => {
    const srcUrl = processedUrl;
    const origUrl = preview;
    if (!srcUrl || !origUrl) return;
    let cancelled = false;
    (async () => {
      const url = await compositeBackground(srcUrl, origUrl, background as any);
      if (!cancelled) setCompositedUrl(url);
    })();
    return () => { cancelled = true; };
  }, [processedUrl, preview, background]);

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
                  onMouseDown={(e) => manualEdit.startDrawing(e.clientX, e.clientY)}
                  onMouseMove={(e) => manualEdit.draw(e.clientX, e.clientY)}
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
                <BeforeAfter before={preview!} after={displayUrl as string} />
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
                  <Button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        AI Remove Background
                      </>
                    )}
                  </Button>

                  <AnimatePresence>
                    {processedUrl && !isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pt-2"
                      >
                        <Button
                          onClick={() => setShowManualEditor(!showManualEditor)}
                          variant={showManualEditor ? "default" : "outline"}
                          className="w-full gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          {showManualEditor ? "Done Refining" : "Manual Refine"}
                        </Button>

                        <Button
                          onClick={handleDownloadPNG}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download PNG (Transparent)
                        </Button>
                        <Button
                          onClick={handleDownloadJPG}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download JPG (White BG)
                        </Button>
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
