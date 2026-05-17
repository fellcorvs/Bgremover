"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
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
    const rect = containerRef.current.getBoundingClientRect();
    const nw = imgRef.current.naturalWidth, nh = imgRef.current.naturalHeight;
    const maxW = rect.width - 40, maxH = 500;
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    const dw = nw * scale, dh = nh * scale;
    setCrop({ x: 10, y: 10, w: Math.min(200, dw - 20), h: Math.min(200, dh - 20) });
  };

  const handleMouseDown = (e: React.MouseEvent, handle: "tl" | "tr" | "bl" | "br" | "move") => {
    e.preventDefault();
    setDragging(handle);
    dragStart.current = { x: e.clientX, y: e.clientY, crop: { ...crop } };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
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

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const applyCrop = () => {
    if (!imgRef.current || !image) return;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const maxW = rect.width - 40, maxH = 500;
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    const dw = nw * scale, dh = nh * scale;
    const offsetX = (rect.width - 40 - dw) / 2;
    const offsetY = Math.max(0, (500 - dh) / 2);
    const sx = (crop.x - offsetX) / scale, sy = (crop.y - offsetY) / scale;
    const sw = crop.w / scale, sh = crop.h / scale;
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
                  <div ref={containerRef} className="relative bg-muted rounded-lg overflow-hidden" style={{ minHeight: 500 }}>
                    <div className="p-5">
                      <Image ref={imgRef} src={image} alt="Source" width={800} height={600} className="w-full h-auto max-h-[460px] object-contain" onLoad={onImageLoad} />
                    </div>
                    {imgRef.current && (
                      <div className="absolute inset-0 p-5">
                        <div className="relative w-full h-full">
                          <div className="absolute inset-0 bg-black/30" style={{ clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${crop.x}px 0%, ${crop.x}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x}px 0%, 0% 0%)` }} />
                          <div className="absolute border-2 border-white" style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}>
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-white cursor-nw-resize" onMouseDown={(e) => handleMouseDown(e, "tl")} />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white cursor-ne-resize" onMouseDown={(e) => handleMouseDown(e, "tr")} />
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white cursor-sw-resize" onMouseDown={(e) => handleMouseDown(e, "bl")} />
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white cursor-se-resize" onMouseDown={(e) => handleMouseDown(e, "br")} />
                            <div className="absolute inset-0 cursor-move" onMouseDown={(e) => handleMouseDown(e, "move")} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={applyCrop} className="flex-1">✂️ Apply Crop</Button>
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
                      <Image src={result} alt="Cropped" width={400} height={300} className="w-full rounded-lg" />
                      <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "cropped.png"; a.click(); }}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Click "Apply Crop"</div>
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
