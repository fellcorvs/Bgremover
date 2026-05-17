"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Plus, X } from "lucide-react";

type LayoutMode = "grid" | "masonry" | "bento" | "split" | "freestyle" | "social";
type SplitDir = "vertical" | "horizontal" | "triple" | "four" | "multi";
type SocialPreset = { label: string; w: number; h: number };
type BentoPreset = "featured-left" | "featured-right" | "featured-top" | "featured-center";
type TemplateStyle = "minimalist" | "vintage" | "wedding" | "birthday" | "travel" | "fashion" | "scrapbook" | "magazine";

const socialPresets: SocialPreset[] = [
  { label: "Instagram Post", w: 1080, h: 1080 },
  { label: "Instagram Story", w: 1080, h: 1920 },
  { label: "Facebook Post", w: 1200, h: 630 },
  { label: "TikTok Cover", w: 1080, h: 1920 },
  { label: "YouTube Thumbnail", w: 1280, h: 720 },
  { label: "Pinterest Pin", w: 1000, h: 1500 },
];

const templates: { label: string; value: TemplateStyle; colors: string[] }[] = [
  { label: "Minimalist", value: "minimalist", colors: ["#ffffff", "#f5f5f5", "#e0e0e0", "#000000"] },
  { label: "Vintage", value: "vintage", colors: ["#f4e4c1", "#d4a574", "#8b5e3c", "#2c1810"] },
  { label: "Wedding", value: "wedding", colors: ["#fff5f5", "#fce4ec", "#e8d5d5", "#9e9e9e"] },
  { label: "Birthday", value: "birthday", colors: ["#fff3e0", "#ffcc02", "#ff6f00", "#e91e63"] },
  { label: "Travel", value: "travel", colors: ["#e3f2fd", "#81d4fa", "#0277bd", "#263238"] },
  { label: "Fashion", value: "fashion", colors: ["#000000", "#1a1a1a", "#333333", "#ffffff"] },
  { label: "Scrapbook", value: "scrapbook", colors: ["#faf3e0", "#e8d5b7", "#c9a96e", "#8b6914"] },
  { label: "Magazine", value: "magazine", colors: ["#ffffff", "#f8f8f8", "#1a1a1a", "#d32f2f"] },
];

type PhotoItem = { src: string; x: number; y: number; w: number; h: number; rotation: number; flipH: boolean; flipV: boolean };

function loadImages(srcs: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    srcs.map((src) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    }))
  );
}

export default function CollageTool() {
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<LayoutMode>("grid");
  const [cols, setCols] = useState(3);
  const [gap, setGap] = useState(8);
  const [radius, setRadius] = useState(0);
  const [padding, setPadding] = useState(0);
  const [bgType, setBgType] = useState<"solid" | "gradient" | "image">("solid");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgColor2, setBgColor2] = useState("#e0e0e0");
  const [bgGradDir, setBgGradDir] = useState("to right");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [splitDir, setSplitDir] = useState<SplitDir>("vertical");
  const [splitRatio, setSplitRatio] = useState(50);
  const [bentoPreset, setBentoPreset] = useState<BentoPreset>("featured-left");
  const [socialPreset, setSocialPreset] = useState<SocialPreset>(socialPresets[0]);
  const [canvasW, setCanvasW] = useState(800);
  const [canvasH, setCanvasH] = useState(600);
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle | null>(null);
  const [freestyleItems, setFreestyleItems] = useState<PhotoItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editCrop, setEditCrop] = useState({ x: 0, y: 0, s: 1 });
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [masonryCols, setMasonryCols] = useState(3);
  const [freestyleDragging, setFreestyleDragging] = useState(false);
  const [freestyleResizing, setFreestyleResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, item: { x: 0, y: 0, w: 0, h: 0 } });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [stickers, setStickers] = useState<string[]>([]);

  const totalSlots = mode === "freestyle" ? images.length : cols * 2;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr].slice(0, 20));
    Promise.all(arr.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); }))).then((urls) => {
      setImages((prev) => [...prev, ...urls].slice(0, 20));
      setFreestyleItems((prev) => [...prev, ...urls.map((src) => ({ src, x: 0, y: 0, w: 150, h: 150, rotation: 0, flipH: false, flipV: false }))].slice(0, 20));
    });
  }, []);

  const triggerUpload = () => fileInputRef.current?.click();

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFreestyleItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const dragOverIdx = useRef<number | null>(null);

  const handleDropReorder = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null) return;
    const to = dragOverIdx.current;
    if (to === null || dragIdx === to) { setDragIdx(null); return; }
    setImages((prev) => { const a = [...prev]; const [m] = a.splice(dragIdx, 1); a.splice(to, 0, m); return a; });
    setFiles((prev) => { const a = [...prev]; const [m] = a.splice(dragIdx, 1); a.splice(to, 0, m); return a; });
    setDragIdx(null);
    dragOverIdx.current = null;
  };

  const applyTemplate = (style: TemplateStyle) => {
    const t = templates.find((x) => x.value === style);
    if (!t) return;
    setTemplateStyle(style);
    setBgType("solid");
    setBgColor(t.colors[0]);
    setBgColor2(t.colors[1]);
  };

  const renderToCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = mode === "social" ? socialPreset.w : canvasW;
    const H = mode === "social" ? socialPreset.h : canvasH;
    canvas.width = W;
    canvas.height = H;
    if (bgType === "solid") { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H); }
    else if (bgType === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, bgGradDir === "to right" ? W : 0, bgGradDir === "to bottom" ? H : 0);
      grad.addColorStop(0, bgColor); grad.addColorStop(1, bgColor2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }
    else if (bgType === "image" && bgImage) {
      const bImg = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = bgImage!; });
      ctx.drawImage(bImg, 0, 0, W, H);
    }
    const pad = padding;
    const usableW = W - pad * 2;
    const usableH = H - pad * 2;
    const loaded = await loadImages(images);
    if (mode === "grid") {
      const c = Math.min(cols, loaded.length);
      const r = Math.ceil(loaded.length / c);
      const cw = (usableW - (c - 1) * gap) / c;
      const ch = (usableH - (r - 1) * gap) / r;
      const s = Math.min(cw, ch);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      let idx = 0;
      for (let row = 0; row < r && idx < loaded.length; row++) {
        for (let col = 0; col < c && idx < loaded.length; col++) {
          const x = pad + col * (s + gap);
          const y = pad + row * (s + gap);
          const img = loaded[idx]; const is = Math.min(img.width, img.height);
          ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, s, s, radius); ctx.clip();
          ctx.drawImage(img, (img.width - is) / 2, (img.height - is) / 2, is, is, x, y, s, s);
          ctx.restore(); idx++;
        }
      }
      ctx.restore();
    } else if (mode === "masonry") {
      const mc = Math.min(masonryCols, loaded.length);
      const colW = (usableW - (mc - 1) * gap) / mc;
      const colHeights = new Array(mc).fill(0);
      ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      for (let i = 0; i < loaded.length; i++) {
        const col = colHeights.indexOf(Math.min(...colHeights));
        const x = pad + col * (colW + gap);
        const y = pad + colHeights[col];
        const img = loaded[i];
        const aspect = img.height / img.width;
        const ih = colW * aspect;
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, colW, ih, radius); ctx.clip();
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, colW, ih);
        ctx.restore();
        colHeights[col] += ih + gap;
      }
      ctx.restore();
    } else if (mode === "bento") {
      ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      const g = gap;
      if (loaded.length >= 1) {
        let bx: number, by: number, bw: number, bh: number;
        const hw = usableW, hh = usableH;
        if (bentoPreset === "featured-left") {
          bx = pad; by = pad; bw = hw * 0.6; bh = hh;
        } else if (bentoPreset === "featured-right") {
          bx = pad + hw * 0.4; by = pad; bw = hw * 0.6; bh = hh;
        } else if (bentoPreset === "featured-top") {
          bx = pad; by = pad; bw = hw; bh = hh * 0.6;
        } else {
          bx = pad + hw * 0.15; by = pad; bw = hw * 0.7; bh = hh;
        }
        const img = loaded[0]; const is = Math.min(img.width, img.height);
        ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw - g, bh - g, radius); ctx.clip();
        ctx.drawImage(img, (img.width - is) / 2, (img.height - is) / 2, is, is, bx, by, bw - g, bh - g);
        ctx.restore();
        for (let i = 1; i < loaded.length; i++) {
          const rows = 2, cellsPerRow = 2;
          const rr = Math.floor((i - 1) / cellsPerRow);
          const cc = (i - 1) % cellsPerRow;
          const cellW = (hw - g) / cellsPerRow;
          const cellH = (hh * 0.4 - g) / rows;
          const ox = bentoPreset === "featured-left" ? pad + hw * 0.6 : pad;
          const oy = bentoPreset === "featured-top" ? pad + hh * 0.6 : pad;
          const ix = ox + cc * (cellW + g);
          const iy = oy + rr * (cellH + g);
          const im = loaded[i]; const ims = Math.min(im.width, im.height);
          ctx.save(); ctx.beginPath(); ctx.roundRect(ix, iy, cellW, cellH, radius); ctx.clip();
          ctx.drawImage(im, (im.width - ims) / 2, (im.height - ims) / 2, ims, ims, ix, iy, cellW, cellH);
          ctx.restore();
        }
      }
      ctx.restore();
    } else if (mode === "split") {
      ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      if (splitDir === "vertical" && loaded.length >= 2) {
        const lw = usableW * (splitRatio / 100);
        const rw = usableW - lw - gap;
        const im1 = loaded[0]; const s1 = Math.min(im1.width, im1.height);
        ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, lw, usableH, radius); ctx.clip();
        ctx.drawImage(im1, (im1.width - s1) / 2, (im1.height - s1) / 2, s1, s1, pad, pad, lw, usableH);
        ctx.restore();
        const im2 = loaded[1]; const s2 = Math.min(im2.width, im2.height);
        ctx.save(); ctx.beginPath(); ctx.roundRect(pad + lw + gap, pad, rw, usableH, radius); ctx.clip();
        ctx.drawImage(im2, (im2.width - s2) / 2, (im2.height - s2) / 2, s2, s2, pad + lw + gap, pad, rw, usableH);
        ctx.restore();
      } else if (splitDir === "horizontal" && loaded.length >= 2) {
        const th = usableH * (splitRatio / 100);
        const bh = usableH - th - gap;
        const im1 = loaded[0]; const s1 = Math.min(im1.width, im1.height);
        ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, th, radius); ctx.clip();
        ctx.drawImage(im1, (im1.width - s1) / 2, (im1.height - s1) / 2, s1, s1, pad, pad, usableW, th);
        ctx.restore();
        const im2 = loaded[1]; const s2 = Math.min(im2.width, im2.height);
        ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad + th + gap, usableW, bh, radius); ctx.clip();
        ctx.drawImage(im2, (im2.width - s2) / 2, (im2.height - s2) / 2, s2, s2, pad, pad + th + gap, usableW, bh);
        ctx.restore();
      } else {
        const parts = splitDir === "triple" ? 3 : splitDir === "four" ? 4 : Math.min(loaded.length, 6);
        const spW = (usableW - (parts - 1) * gap) / parts;
        for (let i = 0; i < Math.min(loaded.length, parts); i++) {
          const im = loaded[i]; const is = Math.min(im.width, im.height);
          ctx.save(); ctx.beginPath(); ctx.roundRect(pad + i * (spW + gap), pad, spW, usableH, radius); ctx.clip();
          ctx.drawImage(im, (im.width - is) / 2, (im.height - is) / 2, is, is, pad + i * (spW + gap), pad, spW, usableH);
          ctx.restore();
        }
      }
      ctx.restore();
    } else if (mode === "freestyle") {
      ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      for (const item of freestyleItems) {
        const img = loaded[freestyleItems.indexOf(item)];
        if (!img) continue;
        ctx.save();
        ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
        ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, radius); ctx.clip();
        const is = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - is) / 2, (img.height - is) / 2, is, is, -item.w / 2, -item.h / 2, item.w, item.h);
        ctx.restore();
      }
      ctx.restore();
    } else if (mode === "social") {
      ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
      const c = Math.ceil(Math.sqrt(loaded.length));
      const r = Math.ceil(loaded.length / c);
      const cw = (usableW - (c - 1) * gap) / c;
      const ch = (usableH - (r - 1) * gap) / r;
      const s = Math.min(cw, ch);
      let idx = 0;
      for (let row = 0; row < r && idx < loaded.length; row++) {
        for (let col = 0; col < c && idx < loaded.length; col++) {
          const x = pad + col * (s + gap);
          const y = pad + row * (s + gap);
          const im = loaded[idx]; const is = Math.min(im.width, im.height);
          ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, s, s, radius); ctx.clip();
          ctx.drawImage(im, (im.width - is) / 2, (im.height - is) / 2, is, is, x, y, s, s);
          ctx.restore(); idx++;
        }
      }
      ctx.restore();
    }
  }, [images, mode, cols, gap, radius, padding, bgType, bgColor, bgColor2, bgGradDir, bgImage, canvasW, canvasH, splitDir, splitRatio, bentoPreset, socialPreset, masonryCols, freestyleItems]);

  useEffect(() => { if (images.length > 0) renderToCanvas(); }, [renderToCanvas, images.length]);

  const handleDownload = () => {
    renderToCanvas().then(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "collage.png"; a.click();
        URL.revokeObjectURL(url);
      });
    });
  };

  const rotateItem = (idx: number) => {
    setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, rotation: item.rotation + 90 } : item));
  };

  const flipHItem = (idx: number) => {
    setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, flipH: !item.flipH } : item));
  };

  const flipVItem = (idx: number) => {
    setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, flipV: !item.flipV } : item));
  };

  const handleFreestyleMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setSelectedIdx(idx);
    const item = freestyleItems[idx];
    if (!item) return;
    setFreestyleDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, item: { ...item } };
  };

  const handleFreestyleResizeDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIdx(idx);
    const item = freestyleItems[idx];
    if (!item) return;
    setFreestyleResizing(true);
    dragStart.current = { x: e.clientX, y: e.clientY, item: { ...item } };
  };

  useEffect(() => {
    if (!freestyleDragging && !freestyleResizing) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (freestyleDragging) {
        setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, x: dragStart.current.item.x + dx, y: dragStart.current.item.y + dy } : item));
      } else if (freestyleResizing) {
        setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, w: Math.max(50, dragStart.current.item.w + dx), h: Math.max(50, dragStart.current.item.h + dy) } : item));
      }
    };
    const handleUp = () => { setFreestyleDragging(false); setFreestyleResizing(false); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [freestyleDragging, freestyleResizing, selectedIdx]);

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-7xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-orange-500">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          </div>
          <h1 className="text-3xl font-bold">Photo Collage</h1>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as LayoutMode)} className="mb-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="masonry">Masonry</TabsTrigger>
            <TabsTrigger value="bento">Bento</TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
            <TabsTrigger value="freestyle">Freestyle</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            {images.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div
                    className="flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed p-12 transition-colors hover:border-primary/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const dt = e.dataTransfer.files; if (dt.length) addFiles(dt); }}
                    onClick={triggerUpload} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}
                  >
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <span className="text-lg font-medium">Upload photos to create a collage</span>
                    <span className="text-sm text-muted-foreground">Drag & drop or click to browse (max 20)</span>
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Photos</Button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <canvas ref={canvasRef} className="w-full rounded-lg border" style={{ minHeight: 200, maxHeight: 600 }} />
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button onClick={handleDownload} className="gap-2"><Download className="h-4 w-4" /> Download</Button>
                    <Button variant="outline" onClick={() => { setImages([]); setFiles([]); setFreestyleItems([]); setBgImage(null); setStickers([]); setTemplateStyle(null); }}>Start Over</Button>
                    <Button variant="outline" onClick={triggerUpload}><Plus className="h-4 w-4" /> Add Photos</Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                  </div>
                </CardContent>
              </Card>
            )}

            {images.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Photos ({images.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {images.map((src, idx) => (
                      <div key={idx} draggable={mode !== "freestyle"} onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => { e.preventDefault(); dragOverIdx.current = idx; }} onDrop={handleDropReorder}
                        className={`relative group rounded-lg overflow-hidden border aspect-square cursor-grab active:cursor-grabbing ${dragIdx === idx ? "opacity-40" : ""}`}>
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-0.5 left-0.5 bg-background/80 rounded text-[10px] px-1 font-medium">{idx + 1}</div>
                        <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100"><X className="h-2.5 w-2.5" /></button>
                        {mode === "freestyle" && (
                          <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100">
                            <button onClick={() => rotateItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v5h-5"/></svg></button>
                            <button onClick={() => flipHItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></svg></button>
                            <button onClick={() => flipVItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="m7 8 5-5 5 5"/><path d="m7 16 5 5 5-5"/></svg></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {images.length < 20 && (
                      <button onClick={triggerUpload} className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <input type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4 pb-8">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Layout</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {mode === "grid" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Columns: {cols}</Label>
                    <Slider value={[cols]} onValueChange={([v]) => setCols(v)} min={1} max={6} step={1} />
                  </div>
                )}
                {mode === "masonry" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Columns: {masonryCols}</Label>
                    <Slider value={[masonryCols]} onValueChange={([v]) => setMasonryCols(v)} min={2} max={6} step={1} />
                  </div>
                )}
                {mode === "bento" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Layout</Label>
                    <Select value={bentoPreset} onValueChange={(v) => setBentoPreset(v as BentoPreset)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured-left">Featured Left</SelectItem>
                        <SelectItem value="featured-right">Featured Right</SelectItem>
                        <SelectItem value="featured-top">Featured Top</SelectItem>
                        <SelectItem value="featured-center">Featured Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {mode === "split" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Type</Label>
                    <Select value={splitDir} onValueChange={(v) => setSplitDir(v as SplitDir)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical Split</SelectItem>
                        <SelectItem value="horizontal">Horizontal Split</SelectItem>
                        <SelectItem value="triple">Triple Split</SelectItem>
                        <SelectItem value="four">Four Split</SelectItem>
                        <SelectItem value="multi">Multi Split</SelectItem>
                      </SelectContent>
                    </Select>
                    {(splitDir === "vertical" || splitDir === "horizontal") && (
                      <div className="space-y-1 mt-2">
                        <Label className="text-xs">Split Ratio: {splitRatio}%</Label>
                        <Slider value={[splitRatio]} onValueChange={([v]) => setSplitRatio(v)} min={10} max={90} step={1} />
                      </div>
                    )}
                  </div>
                )}
                {mode === "social" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Preset</Label>
                    <Select value={`${socialPreset.w}x${socialPreset.h}`} onValueChange={(v) => {
                      const p = socialPresets.find((x) => `${x.w}x${x.h}` === v); if (p) setSocialPreset(p);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {socialPresets.map((p) => (
                          <SelectItem key={p.label} value={`${p.w}x${p.h}`}>{p.label} ({p.w}×{p.h})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(mode === "grid" || mode === "social") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Canvas Width: {canvasW}px</Label>
                    <Slider value={[canvasW]} onValueChange={([v]) => setCanvasW(v)} min={300} max={2000} step={10} />
                    <Label className="text-xs">Canvas Height: {canvasH}px</Label>
                    <Slider value={[canvasH]} onValueChange={([v]) => setCanvasH(v)} min={300} max={2000} step={10} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Style</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Spacing: {gap}px</Label>
                  <Slider value={[gap]} onValueChange={([v]) => setGap(v)} min={0} max={60} step={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Border Radius: {radius}px</Label>
                  <Slider value={[radius]} onValueChange={([v]) => setRadius(v)} min={0} max={50} step={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Padding: {padding}px</Label>
                  <Slider value={[padding]} onValueChange={([v]) => setPadding(v)} min={0} max={100} step={1} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Background</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={bgType} onValueChange={(v) => setBgType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
                {bgType === "solid" && (
                  <div className="flex gap-2 items-center">
                    <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-8 p-0.5" />
                    <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 font-mono text-xs h-8" />
                  </div>
                )}
                {bgType === "gradient" && (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-8 p-0.5" />
                      <Input type="color" value={bgColor2} onChange={(e) => setBgColor2(e.target.value)} className="w-10 h-8 p-0.5" />
                    </div>
                    <Select value={bgGradDir} onValueChange={setBgGradDir}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to right">Horizontal</SelectItem>
                        <SelectItem value="to bottom">Vertical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {bgType === "image" && (
                  <div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => bgFileRef.current?.click()}>
                      {bgImage ? "Change Image" : "Choose Image"}
                    </Button>
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setBgImage(r.result as string); r.readAsDataURL(f); }
                    }} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-1.5">
                  {templates.map((t) => (
                    <button key={t.value} onClick={() => applyTemplate(t.value)}
                      className={`text-xs px-2 py-1.5 rounded-lg border text-left transition-colors ${templateStyle === t.value ? "border-primary bg-primary/10" : "hover:bg-accent"}`}>
                      <div className="flex gap-0.5 mb-1">
                        {t.colors.map((c, i) => <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />)}
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
