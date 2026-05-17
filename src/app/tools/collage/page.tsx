"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Download, Upload, Plus, X } from "lucide-react";

type LayoutPreset = { cols: number; rows: number; label: string };

const presets: LayoutPreset[] = [
  { cols: 1, rows: 1, label: "1×1" },
  { cols: 2, rows: 1, label: "2×1" },
  { cols: 1, rows: 2, label: "1×2" },
  { cols: 2, rows: 2, label: "2×2" },
  { cols: 3, rows: 2, label: "3×2" },
  { cols: 2, rows: 3, label: "2×3" },
  { cols: 3, rows: 3, label: "3×3" },
  { cols: 4, rows: 3, label: "4×3" },
];

export default function CollageTool() {
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [gap, setGap] = useState(8);
  const [borderW, setBorderW] = useState(0);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [borderColor, setBorderColor] = useState("#ffffff");
  const [cellW, setCellW] = useState(300);
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dragOverIdx = useRef<number | null>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr].slice(0, 12));
    Promise.all(arr.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); }))).then((urls) => {
      setImages((prev) => [...prev, ...urls].slice(0, 12));
    });
  }, []);

  const triggerUpload = () => fileInputRef.current?.click();

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIdx.current = idx;
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null) return;
    const to = dragOverIdx.current;
    if (to === null || dragIdx === to) { setDragIdx(null); return; }
    setImages((prev) => { const a = [...prev]; const [m] = a.splice(dragIdx, 1); a.splice(to, 0, m); return a; });
    setFiles((prev) => { const a = [...prev]; const [m] = a.splice(dragIdx, 1); a.splice(to, 0, m); return a; });
    setDragIdx(null);
    dragOverIdx.current = null;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      (dropRef.current as HTMLElement).style.borderColor = "hsl(var(--primary))";
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      (dropRef.current as HTMLElement).style.borderColor = "";
    }
  };

  const totalSlots = cols * rows;
  const maxSlots = 12;

  const renderCollage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = cols * cellW + (cols - 1) * gap + borderW * 2;
    const ch = rows * cellW + (rows - 1) * gap + borderW * 2;
    canvas.width = cw;
    canvas.height = ch;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    const imgs = images.slice(0, totalSlots);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= imgs.length) break;
        const x = c * (cellW + gap) + borderW;
        const y = r * (cellW + gap) + borderW;
        if (borderW > 0) {
          ctx.fillStyle = borderColor;
          ctx.fillRect(x - borderW, y - borderW, cellW + borderW * 2, cellW + borderW * 2);
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          ctx.drawImage(img, sx, sy, s, s, x, y, cellW, cellW);
          if (idx === imgs.length - 1) {
            // all done - noop
          }
        };
        img.src = imgs[idx];
        idx++;
      }
    }
  }, [images, cols, rows, cellW, gap, borderW, bgColor, borderColor, totalSlots]);

  const handleDownload = () => {
    renderCollage();
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "collage.png";
        a.click();
        URL.revokeObjectURL(url);
      });
    }, 200);
  };

  const needsMore = images.length < totalSlots;

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-500">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          </div>
          <h1 className="text-3xl font-bold">Photo Collage</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            {images.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div
                    ref={dropRef}
                    className="flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed p-12 transition-colors hover:border-primary/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { e.preventDefault(); handleDragEnter(e); const dt = e.dataTransfer.files; if (dt.length) addFiles(dt); }}
                    onClick={triggerUpload}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <span className="text-lg font-medium">Upload photos to create a collage</span>
                    <span className="text-sm text-muted-foreground">Drag & drop or click to browse (max 12)</span>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Photos</Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <canvas ref={canvasRef} className="w-full rounded-lg border" style={{ minHeight: 200 }} />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={handleDownload} className="flex-1 gap-2">
                      <Download className="h-4 w-4" /> Download Collage
                    </Button>
                    <Button variant="outline" onClick={() => { setImages([]); setFiles([]); }}>Start Over</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {images.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                    Photos ({images.length}/{totalSlots})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {images.map((src, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={handleDrop}
                        className={`relative group rounded-lg overflow-hidden border aspect-square cursor-grab active:cursor-grabbing ${dragIdx === idx ? "opacity-40" : ""}`}
                      >
                        <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute top-1 left-1 bg-background/80 rounded text-xs px-1.5 py-0.5 font-medium">{idx + 1}</div>
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                        </div>
                      </div>
                    ))}
                    {needsMore && (
                      <button
                        onClick={triggerUpload}
                        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Preset</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => { setCols(p.cols); setRows(p.rows); }}
                        className={`h-10 rounded-lg border text-xs font-medium transition-colors ${cols === p.cols && rows === p.rows ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Columns: {cols}</Label>
                  <Slider value={[cols]} onValueChange={([v]) => setCols(v)} min={1} max={6} step={1} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rows: {rows}</Label>
                  <Slider value={[rows]} onValueChange={([v]) => setRows(v)} min={1} max={6} step={1} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cell Size: {cellW}px</Label>
                  <Slider value={[cellW]} onValueChange={([v]) => setCellW(v)} min={100} max={500} step={10} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Gap: {gap}px</Label>
                  <Slider value={[gap]} onValueChange={([v]) => setGap(v)} min={0} max={60} step={1} />
                </div>
                <div className="space-y-1.5">
                  <Label>Border: {borderW}px</Label>
                  <Slider value={[borderW]} onValueChange={([v]) => setBorderW(v)} min={0} max={30} step={1} />
                </div>
                {borderW > 0 && (
                  <div className="space-y-1.5">
                    <Label>Border Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="w-12 h-9 p-0.5" />
                      <Input value={borderColor} onChange={(e) => setBorderColor(e.target.value)} className="flex-1 font-mono text-sm" />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-12 h-9 p-0.5" />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 font-mono text-sm" />
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={renderCollage}>
                  Preview Collage
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
