"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";

export default function CropTool() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 200, h: 200 });
  const [dragging, setDragging] = useState<"tl" | "tr" | "bl" | "br" | "move" | null>(null);
  const dragStart = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 200, h: 200 } });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setResult(null); }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) { setImage(URL.createObjectURL(file)); setResult(null); }
  };

  const onImageLoad = () => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    setNatural({ w: nw, h: nh });
    updateImgRect();
  };

  const updateImgRect = () => {
    if (!imgRef.current || !containerRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    const cr = containerRef.current.getBoundingClientRect();
    setImgRect({ left: r.left - cr.left, top: r.top - cr.top, width: r.width, height: r.height });
    const initW = Math.min(200, r.width - 20);
    const initH = Math.min(200, r.height - 20);
    setCrop({ x: 10, y: 10, w: initW, h: initH });
  };

  useEffect(() => {
    if (!image) return;
    const onResize = () => updateImgRect();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [image]);

  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): { x: number; y: number } => {
    if ("touches" in e) {
      const t = e.touches?.[0] || (e as TouchEvent).changedTouches?.[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, handle: "tl" | "tr" | "bl" | "br" | "move") => {
    e.preventDefault();
    const pos = getClientPos(e);
    setDragging(handle);
    dragStart.current = { x: pos.x, y: pos.y, crop: { ...crop } };
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging) return;
    const pos = getClientPos(e);
    const dx = pos.x - dragStart.current.x;
    const dy = pos.y - dragStart.current.y;
    const c = dragStart.current.crop;
    const min = 30;
    let nx = c.x, ny = c.y, nw = c.w, nh = c.h;
    if (dragging === "move") { nx = c.x + dx; ny = c.y + dy; }
    else if (dragging === "br") { nw = Math.max(min, c.w + dx); nh = Math.max(min, c.h + dy); }
    else if (dragging === "bl") { nx = c.x + dx; nw = Math.max(min, c.w - dx); nh = Math.max(min, c.h + dy); }
    else if (dragging === "tr") { ny = c.y + dy; nw = Math.max(min, c.w + dx); nh = Math.max(min, c.h - dy); }
    else if (dragging === "tl") { nx = c.x + dx; ny = c.y + dy; nw = Math.max(min, c.w - dx); nh = Math.max(min, c.h - dy); }
    setCrop({ x: nx, y: ny, w: nw, h: nh });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handlePointerMove, { passive: false });
      window.addEventListener("touchend", handlePointerUp);
      return () => {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseup", handlePointerUp);
        window.removeEventListener("touchmove", handlePointerMove);
        window.removeEventListener("touchend", handlePointerUp);
      };
    }
  }, [dragging, handlePointerMove, handlePointerUp]);

  const applyCrop = () => {
    if (!imgRef.current || !image || !natural.w) return;
    const img = imgRef.current;
    const sx = (crop.x / imgRect.width) * natural.w;
    const sy = (crop.y / imgRect.height) * natural.h;
    const sw = (crop.w / imgRect.width) * natural.w;
    const sh = (crop.h / imgRect.height) * natural.h;
    const canvas = document.createElement("canvas");
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob((b) => { if (b) setResult(URL.createObjectURL(b)); });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
          <h1 className="text-3xl font-bold">Crop Image</h1>
        </div>
        {!image ? (
          <Card>
            <CardContent className="p-12">
              <div
                className={`flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed p-12 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerUpload}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-lg font-medium">Upload an image to crop</span>
                <span className="text-sm text-muted-foreground">Drag & drop or click to browse</span>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Image</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardContent className="p-4">
                  <div ref={containerRef} className="relative bg-muted rounded-lg overflow-hidden" style={{ minHeight: 300 }}>
                    <img
                      ref={imgRef}
                      src={image}
                      alt="Source"
                      className="w-full h-auto"
                      onLoad={onImageLoad}
                      draggable={false}
                    />
                    {imgRect.width > 0 && (
                      <div className="absolute inset-0">
                        <div className="relative w-full h-full">
                          <div className="absolute inset-0 bg-black/40" style={{
                            clipPath: `polygon(
                              0% 0%, 100% 0%, 100% 100%, 0% 100%,
                              0% 0%, ${crop.x}px 0%,
                              ${crop.x}px ${crop.y}px,
                              ${crop.x + crop.w}px ${crop.y}px,
                              ${crop.x + crop.w}px ${crop.y + crop.h}px,
                              ${crop.x}px ${crop.y + crop.h}px,
                              ${crop.x}px 0%, 0% 0%
                            )`
                          }} />
                          <div className="absolute border-2 border-white cursor-move" style={{
                            left: crop.x, top: crop.y,
                            width: crop.w, height: crop.h,
                            touchAction: "none"
                          }}
                            onMouseDown={(e) => handlePointerDown(e, "move")}
                            onTouchStart={(e) => handlePointerDown(e, "move")}
                          >
                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-gray-400 cursor-nw-resize"
                              onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, "tl"); }}
                              onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, "tl"); }} />
                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-gray-400 cursor-ne-resize"
                              onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, "tr"); }}
                              onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, "tr"); }} />
                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-gray-400 cursor-sw-resize"
                              onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, "bl"); }}
                              onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, "bl"); }} />
                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-gray-400 cursor-se-resize"
                              onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, "br"); }}
                              onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, "br"); }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={applyCrop} className="flex-1">Apply Crop</Button>
                    <Button variant="outline" onClick={() => { setImage(null); setResult(null); }}>New Image</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Preview</h3>
                  {result ? (
                    <div className="space-y-3">
                      <img src={result} alt="Cropped" className="w-full rounded-lg" />
                      <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "cropped.png"; a.click(); }}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Click &quot;Apply Crop&quot;</div>
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
