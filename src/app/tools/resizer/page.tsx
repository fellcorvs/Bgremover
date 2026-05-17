"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Upload } from "lucide-react";

export default function ImageExpandTool() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expand, setExpand] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [dragging, setDragging] = useState<"top" | "bottom" | "left" | "right" | "tl" | "tr" | "bl" | "br" | null>(null);
  const dragStart = useRef({ x: 0, y: 0, expand: { top: 0, bottom: 0, left: 0, right: 0 } });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0, scale: 1 });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setResult(null); setExpand({ top: 0, bottom: 0, left: 0, right: 0 }); }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) { setImage(URL.createObjectURL(file)); setResult(null); setExpand({ top: 0, bottom: 0, left: 0, right: 0 }); }
  };

  const onImageLoad = () => {
    if (!imgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nw = imgRef.current.naturalWidth, nh = imgRef.current.naturalHeight;
    const maxW = rect.width - 40, maxH = 500;
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    setDisplaySize({ w: nw * scale, h: nh * scale, scale });
  };

  useEffect(() => {
    if (!imgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nw = imgRef.current.naturalWidth, nh = imgRef.current.naturalHeight;
    const maxW = rect.width - 40, maxH = 500;
    const scale = Math.min(maxW / nw, maxH / nh, 1);
    setDisplaySize({ w: nw * scale, h: nh * scale, scale });
  }, [image]);

  const handleMouseDown = (e: React.MouseEvent, handle: "top" | "bottom" | "left" | "right" | "tl" | "tr" | "bl" | "br") => {
    e.preventDefault();
    setDragging(handle);
    dragStart.current = { x: e.clientX, y: e.clientY, expand: { ...expand } };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const s = displaySize.scale;
    const c = dragStart.current.expand;
    const min = 0;
    let nt = c.top, nb = c.bottom, nl = c.left, nr = c.right;
    if (dragging === "top" || dragging === "tl" || dragging === "tr") { nt = Math.max(min, c.top - dy / s); }
    if (dragging === "bottom" || dragging === "bl" || dragging === "br") { nb = Math.max(min, c.bottom + dy / s); }
    if (dragging === "left" || dragging === "tl" || dragging === "bl") { nl = Math.max(min, c.left - dx / s); }
    if (dragging === "right" || dragging === "tr" || dragging === "br") { nr = Math.max(min, c.right + dx / s); }
    setExpand({ top: Math.round(nt), bottom: Math.round(nb), left: Math.round(nl), right: Math.round(nr) });
  }, [dragging, displaySize.scale]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const applyExpand = () => {
    if (!imgRef.current || !image) return;
    const img = imgRef.current;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const cw = nw + expand.left + expand.right;
    const ch = nh + expand.top + expand.bottom;
    if (cw <= nw && ch <= nh) return;
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(img, expand.left, expand.top, nw, nh);

    const blurRadius = Math.max(20, Math.min(expand.top, expand.bottom, expand.left, expand.right) * 0.3);

    if (expand.top > 0) {
      const stripH = Math.min(expand.top, 40);
      const stripData = ctx.getImageData(expand.left, expand.top, nw, stripH);
      for (let y = 0; y < expand.top; y++) {
        const alpha = 1 - y / expand.top;
        ctx.globalAlpha = alpha * 0.8;
        ctx.filter = `blur(${blurRadius + y * 0.5}px)`;
        ctx.drawImage(img, expand.left - (expand.left * y / expand.top), expand.top - y, nw + (expand.left + expand.right) * y / expand.top, stripH, 0, expand.top - y - stripH, cw, stripH);
      }
      ctx.globalAlpha = 1; ctx.filter = "none";
    }

    if (expand.bottom > 0) {
      const stripH = Math.min(expand.bottom, 40);
      for (let y = 0; y < expand.bottom; y++) {
        const alpha = 1 - y / expand.bottom;
        ctx.globalAlpha = alpha * 0.8;
        ctx.filter = `blur(${blurRadius + y * 0.5}px)`;
        ctx.drawImage(img, expand.left - (expand.left * y / expand.bottom), nh + expand.top, nw + (expand.left + expand.right) * y / expand.bottom, stripH, 0, nh + expand.top + y, cw, stripH);
      }
      ctx.globalAlpha = 1; ctx.filter = "none";
    }

    if (expand.left > 0) {
      const stripW = Math.min(expand.left, 40);
      for (let x = 0; x < expand.left; x++) {
        const alpha = 1 - x / expand.left;
        ctx.globalAlpha = alpha * 0.8;
        ctx.filter = `blur(${blurRadius + x * 0.5}px)`;
        ctx.drawImage(img, expand.left, expand.top, stripW, nh, expand.left - x - stripW, expand.top, stripW, ch);
      }
      ctx.globalAlpha = 1; ctx.filter = "none";
    }

    if (expand.right > 0) {
      const stripW = Math.min(expand.right, 40);
      for (let x = 0; x < expand.right; x++) {
        const alpha = 1 - x / expand.right;
        ctx.globalAlpha = alpha * 0.8;
        ctx.filter = `blur(${blurRadius + x * 0.5}px)`;
        ctx.drawImage(img, nw - stripW, expand.top, stripW, nh, nw + expand.left + x, expand.top, stripW, ch);
      }
      ctx.globalAlpha = 1; ctx.filter = "none";
    }

    ctx.globalAlpha = 1; ctx.filter = "none";

    const cornerSize = Math.min(expand.top, expand.left, 30);
    if (cornerSize > 0 && expand.top > 0 && expand.left > 0) {
      ctx.filter = `blur(${blurRadius * 1.5}px)`;
      ctx.drawImage(img, expand.left, expand.top, cornerSize, cornerSize, 0, 0, expand.left, expand.top);
      ctx.filter = "none";
    }

    canvas.toBlob((b) => { if (b) setResult(URL.createObjectURL(b)); }, "image/png", 1);
  };

  const containerW = displaySize.w + expand.left * displaySize.scale + expand.right * displaySize.scale;
  const containerH = displaySize.h + expand.top * displaySize.scale + expand.bottom * displaySize.scale;
  const imgOffsetX = expand.left * displaySize.scale;
  const imgOffsetY = expand.top * displaySize.scale;

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          <h1 className="text-3xl font-bold">Image Expand</h1>
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
                <span className="text-lg font-medium">Upload an image to expand</span>
                <span className="text-sm text-muted-foreground">Drag handles outward to expand • AI fills the new areas</span>
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
                  <div ref={containerRef} className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: 500 }}>
                    <div className="relative" style={{ width: Math.max(containerW, displaySize.w + 40), height: Math.max(containerH, displaySize.h + 40) }}>
                      <div className="absolute inset-0" style={{ left: imgOffsetX, top: imgOffsetY }}>
                        <Image ref={imgRef} src={image} alt="Source" width={800} height={600} className="w-full h-auto max-h-[460px] object-contain" onLoad={onImageLoad} />
                      </div>
                      {(expand.top > 0 || expand.bottom > 0 || expand.left > 0 || expand.right > 0) && (
                        <div className="absolute inset-0 pointer-events-none" style={{ width: containerW, height: containerH }}>
                          <div className="absolute inset-0 border-2 border-dashed border-primary/40" style={{ left: imgOffsetX - expand.left * displaySize.scale, top: imgOffsetY - expand.top * displaySize.scale, width: containerW, height: containerH }} />
                          <div className="absolute bg-primary/10" style={{ left: imgOffsetX - expand.left * displaySize.scale, top: imgOffsetY - expand.top * displaySize.scale, width: containerW, height: expand.top * displaySize.scale }} />
                          <div className="absolute bg-primary/10" style={{ left: imgOffsetX - expand.left * displaySize.scale, top: imgOffsetY + displaySize.h, width: containerW, height: expand.bottom * displaySize.scale }} />
                          <div className="absolute bg-primary/10" style={{ left: imgOffsetX - expand.left * displaySize.scale, top: imgOffsetY - expand.top * displaySize.scale, width: expand.left * displaySize.scale, height: containerH }} />
                          <div className="absolute bg-primary/10" style={{ left: imgOffsetX + displaySize.w, top: imgOffsetY - expand.top * displaySize.scale, width: expand.right * displaySize.scale, height: containerH }} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-ns-resize pointer-events-auto shadow-lg" style={{ left: containerW / 2 - 8, top: -8 }} onMouseDown={(e) => handleMouseDown(e, "top")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-ns-resize pointer-events-auto shadow-lg" style={{ left: containerW / 2 - 8, bottom: -8 }} onMouseDown={(e) => handleMouseDown(e, "bottom")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-ew-resize pointer-events-auto shadow-lg" style={{ left: -8, top: containerH / 2 - 8 }} onMouseDown={(e) => handleMouseDown(e, "left")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-ew-resize pointer-events-auto shadow-lg" style={{ right: -8, top: containerH / 2 - 8 }} onMouseDown={(e) => handleMouseDown(e, "right")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" style={{ left: -8, top: -8 }} onMouseDown={(e) => handleMouseDown(e, "tl")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" style={{ right: -8, top: -8 }} onMouseDown={(e) => handleMouseDown(e, "tr")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-nesw-resize pointer-events-auto shadow-lg" style={{ left: -8, bottom: -8 }} onMouseDown={(e) => handleMouseDown(e, "bl")} />
                          <div className="absolute w-4 h-4 bg-primary rounded-full cursor-nwse-resize pointer-events-auto shadow-lg" style={{ right: -8, bottom: -8 }} onMouseDown={(e) => handleMouseDown(e, "br")} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button onClick={applyExpand} className="flex-1" disabled={expand.top === 0 && expand.bottom === 0 && expand.left === 0 && expand.right === 0}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                      Apply Expand
                    </Button>
                    <Button variant="outline" onClick={() => setExpand({ top: 0, bottom: 0, left: 0, right: 0 })}>Reset</Button>
                    <Button variant="outline" onClick={() => { setImage(null); setResult(null); }}>New Image</Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {imgRef.current && `Original: ${imgRef.current.naturalWidth}×${imgRef.current.naturalHeight}px → Expanded: ${imgRef.current.naturalWidth + expand.left + expand.right}×${imgRef.current.naturalHeight + expand.top + expand.bottom}px`}
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
                      <Image src={result} alt="Expanded" width={500} height={400} className="w-full rounded-lg border bg-muted" />
                      <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "expanded.png"; a.click(); }}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Drag handles outward, then click "Apply Expand"</div>
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
