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

type PhotoItem = { src: string; x: number; y: number; w: number; h: number; rotation: number; flipH: boolean; flipV: boolean; offsetX: number; offsetY: number; imgScale: number; locked?: boolean };

type TextLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  letterSpacing: number;
  effect: "none" | "shadow" | "outline" | "glow";
  effectColor: string;
  rotation: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
};

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
  const itemsRef = useRef(freestyleItems);
  itemsRef.current = freestyleItems;
  const selRef = useRef<number | null>(null);
  selRef.current = selectedIdx;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const [stickers, setStickers] = useState<string[]>([]);
  const [textLabels, setTextLabels] = useState<TextLabel[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textDragIdx, setTextDragIdx] = useState<number | null>(null);
  const prevModeRef = useRef<LayoutMode | null>(null);
  const [photoDragIdx, setPhotoDragIdx] = useState<number | null>(null);
  const [photoResizeIdx, setPhotoResizeIdx] = useState<number | null>(null);
  const [photoRotateIdx, setPhotoRotateIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);
  hoveredRef.current = hoveredIdx;
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selectedIdx;
  const [panMode, setPanMode] = useState(false);
  const [photoPanIdx, setPhotoPanIdx] = useState<number | null>(null);
  const cachedImagesRef = useRef<HTMLImageElement[]>([]);
  const isDraggingRef = useRef(false);
  const dragWRef = useRef(800);
  const dragHRef = useRef(600);

  const layoutItems = useCallback((itemCount: number, W: number, H: number) => {
    const padAmt = padding;
    const uW = W - padAmt * 2;
    const uH = H - padAmt * 2;
    const g = gap;
    setFreestyleItems((prev) => {
      const items = prev.length >= itemCount ? prev : [...prev, ...Array(itemCount - prev.length).fill(null).map((_, i) => ({
        src: "", x: 0, y: 0, w: 150, h: 150, rotation: 0, flipH: false, flipV: false, offsetX: 0, offsetY: 0, imgScale: 1,
      }))];
      return items.slice(0, itemCount).map((item, idx) => {
        if (item.x !== 0 || item.y !== 0) return item;
        if (mode === "grid") {
          const c = Math.min(cols, itemCount);
          const r = Math.ceil(itemCount / c);
          const cw = (uW - (c - 1) * g) / c;
          const ch = (uH - (r - 1) * g) / r;
          const s = Math.min(cw, ch);
          const col = idx % c;
          const row = Math.floor(idx / c);
          return { ...item, x: padAmt + col * (s + g), y: padAmt + row * (s + g), w: s, h: s };
        }
        if (mode === "masonry") {
          const mc = Math.min(masonryCols, itemCount);
          const colW = (uW - (mc - 1) * g) / mc;
          const colHs = new Array(mc).fill(0);
          for (let i = 0; i <= idx; i++) {
            const col = colHs.indexOf(Math.min(...colHs));
            if (i === idx) return { ...item, x: padAmt + col * (colW + g), y: padAmt + colHs[col], w: colW, h: colW };
            colHs[col] += colW + g;
          }
          return item;
        }
        if (mode === "bento") {
          const hw = uW, hh = uH;
          if (idx === 0) {
            let bw = hw * 0.6, bh = hh;
            if (bentoPreset === "featured-top") { bw = hw; bh = hh * 0.6; }
            if (bentoPreset === "featured-center") { bw = hw * 0.7; bh = hh; }
            const bx = bentoPreset === "featured-right" ? padAmt + hw * 0.4 : bentoPreset === "featured-center" ? padAmt + hw * 0.15 : padAmt;
            return { ...item, x: bx, y: padAmt, w: bw - g, h: bh - g };
          }
          const rows = 2, cpr = 2;
          const rr = Math.floor((idx - 1) / cpr);
          const cc = (idx - 1) % cpr;
          const cw = (hw - g) / cpr;
          const ch = (hh * 0.4 - g) / rows;
          const ox = bentoPreset === "featured-left" ? padAmt + hw * 0.6 : padAmt;
          const oy = bentoPreset === "featured-top" ? padAmt + hh * 0.6 : padAmt;
          return { ...item, x: ox + cc * (cw + g), y: oy + rr * (ch + g), w: cw, h: ch };
        }
        if (mode === "split") {
          if (splitDir === "vertical" && idx === 0) return { ...item, x: padAmt, y: padAmt, w: uW * (splitRatio / 100) - g / 2, h: uH };
          if (splitDir === "vertical" && idx === 1) return { ...item, x: padAmt + uW * (splitRatio / 100) + g / 2, y: padAmt, w: uW * (1 - splitRatio / 100) - g / 2, h: uH };
          if (splitDir === "horizontal" && idx === 0) return { ...item, x: padAmt, y: padAmt, w: uW, h: uH * (splitRatio / 100) - g / 2 };
          if (splitDir === "horizontal" && idx === 1) return { ...item, x: padAmt, y: padAmt + uH * (splitRatio / 100) + g / 2, w: uW, h: uH * (1 - splitRatio / 100) - g / 2 };
          const parts = splitDir === "triple" ? 3 : splitDir === "four" ? 4 : Math.min(itemCount, 6);
          const spW = (uW - (parts - 1) * g) / parts;
          if (idx < parts) return { ...item, x: padAmt + idx * (spW + g), y: padAmt, w: spW, h: uH };
          return item;
        }
        if (mode === "social") {
          const c = Math.ceil(Math.sqrt(itemCount));
          const r = Math.ceil(itemCount / c);
          const cw = (uW - (c - 1) * g) / c;
          const ch = (uH - (r - 1) * g) / r;
          const s = Math.min(cw, ch);
          const col = idx % c;
          const row = Math.floor(idx / c);
          return { ...item, x: padAmt + col * (s + g), y: padAmt + row * (s + g), w: s, h: s };
        }
        return item;
      });
    });
  }, [mode, cols, gap, padding, masonryCols, bentoPreset, splitDir, splitRatio]);

  const calcItemPos = useCallback((idx: number, total: number, W: number, H: number): { x: number; y: number; w: number; h: number } | null => {
    const padAmt = padding, uW = W - padAmt * 2, uH = H - padAmt * 2, g = gap;
    if (mode === "grid" || mode === "freestyle" || mode === "social") {
      const c = mode === "social" ? Math.ceil(Math.sqrt(total)) : Math.min(cols, total);
      const r = Math.ceil(total / c);
      const cw = (uW - (c - 1) * g) / c;
      const ch = (uH - (r - 1) * g) / r;
      const s = Math.min(cw, ch);
      return { x: padAmt + (idx % c) * (s + g), y: padAmt + Math.floor(idx / c) * (s + g), w: s, h: s };
    }
    if (mode === "masonry") {
      const mc = Math.min(masonryCols, total);
      const colW = (uW - (mc - 1) * g) / mc;
      const colHs = new Array(mc).fill(0);
      for (let i = 0; i <= idx; i++) {
        const col = colHs.indexOf(Math.min(...colHs));
        if (i === idx) return { x: padAmt + col * (colW + g), y: padAmt + colHs[col], w: colW, h: colW };
        colHs[col] += colW + g;
      }
    }
    if (mode === "bento") {
      if (idx === 0) {
        let bw = uW * 0.6, bh = uH;
        if (bentoPreset === "featured-top") { bw = uW; bh = uH * 0.6; }
        if (bentoPreset === "featured-center") { bw = uW * 0.7; bh = uH; }
        const bx = bentoPreset === "featured-right" ? padAmt + uW * 0.4 : bentoPreset === "featured-center" ? padAmt + uW * 0.15 : padAmt;
        return { x: bx, y: padAmt, w: bw - g, h: bh - g };
      }
      const cellsPerRow = 2, rows = 2;
      const cw = (uW - g) / cellsPerRow;
      const ch = (uH * 0.4 - g) / rows;
      const ox = bentoPreset === "featured-left" ? padAmt + uW * 0.6 : padAmt;
      const oy = bentoPreset === "featured-top" ? padAmt + uH * 0.6 : padAmt;
      return { x: ox + ((idx - 1) % cellsPerRow) * (cw + g), y: oy + Math.floor((idx - 1) / cellsPerRow) * (ch + g), w: cw, h: ch };
    }
    if (mode === "split") {
      if (splitDir === "vertical" && idx === 0) return { x: padAmt, y: padAmt, w: uW * (splitRatio / 100) - g / 2, h: uH };
      if (splitDir === "vertical" && idx === 1) return { x: padAmt + uW * (splitRatio / 100) + g / 2, y: padAmt, w: uW * (1 - splitRatio / 100) - g / 2, h: uH };
      if (splitDir === "horizontal" && idx === 0) return { x: padAmt, y: padAmt, w: uW, h: uH * (splitRatio / 100) - g / 2 };
      if (splitDir === "horizontal" && idx === 1) return { x: padAmt, y: padAmt + uH * (splitRatio / 100) + g / 2, w: uW, h: uH * (1 - splitRatio / 100) - g / 2 };
      const parts = splitDir === "triple" ? 3 : splitDir === "four" ? 4 : Math.min(total, 6);
      const spW = (uW - (parts - 1) * g) / parts;
      if (idx < parts) return { x: padAmt + idx * (spW + g), y: padAmt, w: spW, h: uH };
    }
    return { x: padAmt, y: padAmt, w: 150, h: 150 };
  }, [mode, cols, gap, padding, masonryCols, bentoPreset, splitDir, splitRatio]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr].slice(0, 20));
    Promise.all(arr.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); }))).then((urls) => {
      setImages((prev) => [...prev, ...urls].slice(0, 20));
      setFreestyleItems((prev) => {
        const existing = prev.length;
        const newItems = urls.map((src, i) => ({ src, x: 0, y: 0, w: 150, h: 150, rotation: 0, flipH: false, flipV: false, offsetX: 0, offsetY: 0, imgScale: 1 }));
        const merged = [...prev, ...newItems].slice(0, 20);
        if (existing === 0) {
          const W = mode === "social" ? socialPreset.w : canvasW;
          const H = mode === "social" ? socialPreset.h : canvasH;
          merged.forEach((item, idx) => { const pos = calcItemPos(idx, merged.length, W, H); if (pos) { item.x = pos.x; item.y = pos.y; item.w = pos.w; item.h = pos.h; } });
        }
        return merged;
      });
    });
  }, [mode, cols, gap, padding, masonryCols, bentoPreset, splitDir, splitRatio, canvasW, canvasH, socialPreset]);

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

  const addText = () => {
    const id = Math.random().toString(36).slice(2);
    setTextLabels((prev) => [...prev, {
      id, text: "Your Text",
      x: 50, y: 50,
      fontSize: 32,
      fontFamily: "Arial",
      color: "#ffffff",
      bold: false,
      italic: false,
      letterSpacing: 0,
      effect: "none",
      effectColor: "#000000",
      rotation: 0,
      textAlign: "left",
      verticalAlign: "top",
    }]);
    setEditingTextId(id);
  };

  const updateText = (id: string, patch: Partial<TextLabel>) => {
    setTextLabels((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  };

  const removeText = (id: string) => {
    setTextLabels((prev) => prev.filter((t) => t.id !== id));
    if (editingTextId === id) setEditingTextId(null);
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
    dragWRef.current = W;
    dragHRef.current = H;
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
    cachedImagesRef.current = loaded;
    ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
    for (let idx = 0; idx < Math.min(freestyleItems.length, loaded.length); idx++) {
      const item = freestyleItems[idx];
      const img = loaded[idx];
      if (!img || !item) continue;
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, radius); ctx.clip();
      const sc = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
      const offX = (item.offsetX || 0) * sc;
      const offY = (item.offsetY || 0) * sc;
      ctx.drawImage(img, -img.width * sc / 2 + offX, -img.height * sc / 2 + offY, img.width * sc, img.height * sc);
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    for (const t of textLabels) {
      const lines = t.text.split("\n");
      const lineH = t.fontSize * 1.2;
      const totalH = lines.length * lineH;
      ctx.save();
      ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;

      const lineWidths = lines.map((l) => l.split("").reduce((w, ch) => w + ctx.measureText(ch).width + t.letterSpacing, -t.letterSpacing));
      const maxW = Math.max(...lineWidths, 0);
      const alignOffX = t.textAlign === "center" ? -maxW / 2 : t.textAlign === "right" ? -maxW : 0;
      const alignOffY = t.verticalAlign === "middle" ? -totalH / 2 : t.verticalAlign === "bottom" ? -totalH : 0;
      ctx.translate(t.x + alignOffX, t.y + alignOffY);
      ctx.rotate((t.rotation * Math.PI) / 180);
      for (let li = 0; li < lines.length; li++) {
        const lx = 0;
        const ly = li * lineH;
        const chars = lines[li].split("");
        const lineW = lineWidths[li];
        const lineOffX = t.textAlign === "center" ? -lineW / 2 : t.textAlign === "right" ? -lineW : 0;
        if (t.effect === "shadow") {
          ctx.fillStyle = t.effectColor;
          ctx.globalAlpha = 0.5;
          let cx = lineOffX + 3;
          for (const ch of chars) { ctx.fillText(ch, cx, ly + 3); cx += ctx.measureText(ch).width + t.letterSpacing; }
          ctx.globalAlpha = 1;
        }
        if (t.effect === "outline") {
          ctx.strokeStyle = t.effectColor;
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          let cx = lineOffX;
          for (const ch of chars) { ctx.strokeText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        }
        ctx.fillStyle = t.color;
        let cx = lineOffX;
        if (t.effect === "glow") { ctx.shadowColor = t.effectColor; ctx.shadowBlur = 15; }
        for (const ch of chars) { ctx.fillText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    ctx.restore();
  }, [images, mode, cols, gap, radius, padding, bgType, bgColor, bgColor2, bgGradDir, bgImage, canvasW, canvasH, splitDir, splitRatio, bentoPreset, socialPreset, masonryCols, freestyleItems, textLabels]);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || freestyleItems.length === 0) return;
    const sel = selectedRef.current;
    const hov = hoveredRef.current;
    for (let idx = 0; idx < freestyleItems.length; idx++) {
      const show = idx === sel || idx === hov;
      if (!show) continue;
      const item = freestyleItems[idx];
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      if (idx === hov && idx !== sel) {
        ctx.shadowColor = "rgba(59,130,246,0.3)";
        ctx.shadowBlur = 20;
        ctx.strokeStyle = "rgba(59,130,246,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-item.w / 2 - 2, -item.h / 2 - 2, item.w + 4, item.h + 4);
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = idx === sel ? 2.5 : 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-item.w / 2, -item.h / 2, item.w, item.h);
      ctx.setLineDash([]);
      const hs = 8;
      const corners: [number, number][] = [[-1,-1],[1,-1],[-1,1],[1,1]];
      for (const [sx, sy] of corners) {
        const hx = sx * (item.w / 2) - sx * hs;
        const hy = sy * (item.h / 2) - sy * hs;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.fillRect(hx, hy, hs * 2, hs * 2);
        ctx.strokeRect(hx, hy, hs * 2, hs * 2);
      }
      const edges: [number, number][] = [[0,-1],[0,1],[-1,0],[1,0]];
      for (const [sx, sy] of edges) {
        const ex = sx * (item.w / 2) - 4;
        const ey = sy * (item.h / 2) - 4;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.fillRect(ex, ey, 8, 8);
        ctx.strokeRect(ex, ey, 8, 8);
      }
      ctx.beginPath();
      ctx.arc(0, -item.h / 2 - 20, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -item.h / 2 - 10);
      ctx.lineTo(0, -item.h / 2 - 32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -item.h / 2 - 32);
      ctx.lineTo(-5, -item.h / 2 - 24);
      ctx.moveTo(0, -item.h / 2 - 32);
      ctx.lineTo(5, -item.h / 2 - 24);
      ctx.stroke();
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(0, -item.h / 2 - 20, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [freestyleItems]);

  const quickRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || cachedImagesRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = mode === "social" ? socialPreset.w : canvasW;
    const H = mode === "social" ? socialPreset.h : canvasH;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgType === "solid") { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H); }
    else if (bgType === "gradient") {
      const grad = ctx.createLinearGradient(0, 0, bgGradDir === "to right" ? W : 0, bgGradDir === "to bottom" ? H : 0);
      grad.addColorStop(0, bgColor); grad.addColorStop(1, bgColor2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }
    else if (bgType === "image" && bgImage) {
      const bImg = cachedImagesRef.current.find(() => true) || new Image();
      if (bImg.src) ctx.drawImage(bImg, 0, 0, W, H);
    }
    const pad = padding;
    const usableW = W - pad * 2;
    const usableH = H - pad * 2;
    const loaded = cachedImagesRef.current;
    ctx.save(); ctx.beginPath(); ctx.roundRect(pad, pad, usableW, usableH, radius); ctx.clip();
    for (let idx = 0; idx < Math.min(freestyleItems.length, loaded.length); idx++) {
      const item = freestyleItems[idx];
      const img = loaded[idx];
      if (!img || !item) continue;
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, radius); ctx.clip();
      const sc = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
      const offX = (item.offsetX || 0) * sc;
      const offY = (item.offsetY || 0) * sc;
      ctx.drawImage(img, -img.width * sc / 2 + offX, -img.height * sc / 2 + offY, img.width * sc, img.height * sc);
      ctx.restore();
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    for (const t of textLabels) {
      const lines = t.text.split("\n");
      const lineH = t.fontSize * 1.2;
      const totalH = lines.length * lineH;
      ctx.save();
      ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
      const lineWidths = lines.map((l) => l.split("").reduce((w, ch) => w + ctx.measureText(ch).width + t.letterSpacing, -t.letterSpacing));
      const maxW = Math.max(...lineWidths, 0);
      const alignOffX = t.textAlign === "center" ? -maxW / 2 : t.textAlign === "right" ? -maxW : 0;
      const alignOffY = t.verticalAlign === "middle" ? -totalH / 2 : t.verticalAlign === "bottom" ? -totalH : 0;
      ctx.translate(t.x + alignOffX, t.y + alignOffY);
      ctx.rotate((t.rotation * Math.PI) / 180);
      for (let li = 0; li < lines.length; li++) {
        const lx = 0;
        const ly = li * lineH;
        const chars = lines[li].split("");
        const lineW = lineWidths[li];
        const lineOffX = t.textAlign === "center" ? -lineW / 2 : t.textAlign === "right" ? -lineW : 0;
        if (t.effect === "shadow") {
          ctx.fillStyle = t.effectColor;
          ctx.globalAlpha = 0.5;
          let cx = lineOffX + 3;
          for (const ch of chars) { ctx.fillText(ch, cx, ly + 3); cx += ctx.measureText(ch).width + t.letterSpacing; }
          ctx.globalAlpha = 1;
        }
        if (t.effect === "outline") {
          ctx.strokeStyle = t.effectColor;
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          let cx = lineOffX;
          for (const ch of chars) { ctx.strokeText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        }
        ctx.fillStyle = t.color;
        let cx = lineOffX;
        if (t.effect === "glow") { ctx.shadowColor = t.effectColor; ctx.shadowBlur = 15; }
        for (const ch of chars) { ctx.fillText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    ctx.restore();
    drawOverlay();
  }, [mode, canvasW, canvasH, bgType, bgColor, bgColor2, bgGradDir, bgImage, padding, radius, freestyleItems, textLabels, drawOverlay]);

  const prevImageLenRef = useRef(0);
  useEffect(() => {
    if (images.length === 0 || freestyleItems.length === 0) return;
    const curLayout = { gap, padding, cols, masonryCols, bentoPreset, splitDir, splitRatio, canvasW, canvasH, socialPreset: socialPreset.label };
    const prevLayout = prevLayoutRef.current;
    const layoutChanged = mode !== "freestyle" && (curLayout.gap !== prevLayout.gap || curLayout.padding !== prevLayout.padding || curLayout.cols !== prevLayout.cols || curLayout.masonryCols !== prevLayout.masonryCols || curLayout.bentoPreset !== prevLayout.bentoPreset || curLayout.splitDir !== prevLayout.splitDir || curLayout.splitRatio !== prevLayout.splitRatio || curLayout.canvasW !== prevLayout.canvasW || curLayout.canvasH !== prevLayout.canvasH || curLayout.socialPreset !== prevLayout.socialPreset);
    if (layoutChanged) {
      prevLayoutRef.current = curLayout;
      const W = mode === "social" ? socialPreset.w : canvasW;
      const H = mode === "social" ? socialPreset.h : canvasH;
      setFreestyleItems((prev) => prev.map((item, idx) => {
        if (item.locked) return item;
        const pos = calcItemPos(idx, prev.length, W, H);
        return pos ? { ...item, x: pos.x, y: pos.y, w: pos.w, h: pos.h, rotation: 0 } : item;
      }));
      return;
    }
    if (prevImageLenRef.current !== images.length || cachedImagesRef.current.length === 0) {
      prevImageLenRef.current = images.length;
      renderToCanvas().then(() => drawOverlay());
    } else if (!isDraggingRef.current) {
      quickRender();
    }
  }, [renderToCanvas, images.length, quickRender, drawOverlay, mode, gap, padding, cols, masonryCols, bentoPreset, splitDir, splitRatio, canvasW, canvasH, socialPreset]);

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

  useEffect(() => {
    if (prevModeRef.current && prevModeRef.current !== mode && images.length > 0) {
      const W = mode === "social" ? socialPreset.w : canvasW;
      const H = mode === "social" ? socialPreset.h : canvasH;
      setFreestyleItems((prev) => prev.map((item, idx) => {
        const pos = calcItemPos(idx, prev.length, W, H);
        return pos ? { ...item, x: pos.x, y: pos.y, w: pos.w, h: pos.h, rotation: 0 } : item;
      }));
    }
    prevModeRef.current = mode;
  }, [mode]);

  const prevLayoutRef = useRef({ gap: 8, padding: 0, cols: 3, masonryCols: 3, bentoPreset: "featured-left", splitDir: "vertical", splitRatio: 50, canvasW: 800, canvasH: 600, socialPreset: socialPresets[0].label });

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
    if (!freestyleDragging && !freestyleResizing && textDragIdx === null && photoDragIdx === null && photoResizeIdx === null && photoRotateIdx === null && photoPanIdx === null) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        quickRender();
      }
      return;
    }
    isDraggingRef.current = true;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (freestyleDragging || photoDragIdx !== null) {
        const idx = freestyleDragging ? selectedIdx : photoDragIdx;
        setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, x: dragStart.current.item.x + dx, y: dragStart.current.item.y + dy } : item));
      } else if (photoPanIdx !== null) {
        const cvs = canvasRef.current;
        const items = itemsRef.current;
        if (cvs && items[photoPanIdx]) {
          const rect = cvs.getBoundingClientRect();
          const sc = cvs.width / rect.width;
          const mx = (e.clientX - rect.left) * sc;
          const my = (e.clientY - rect.top) * sc;
          const it = items[photoPanIdx];
          const s = it.imgScale || 1;
          setFreestyleItems((prev) => prev.map((iv, i) => i === photoPanIdx ? { ...iv, offsetX: (iv.offsetX || 0) + (mx - (dragStart.current.item.x)) / s, offsetY: (iv.offsetY || 0) + (my - (dragStart.current.item.y)) / s } : iv));
          dragStart.current.x = e.clientX;
          dragStart.current.y = e.clientY;
        }
      } else if (freestyleResizing || photoResizeIdx !== null) {
        const idx = freestyleResizing ? selectedIdx : photoResizeIdx;
        setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, w: Math.max(50, dragStart.current.item.w + dx), h: Math.max(50, dragStart.current.item.h + dy) } : item));
      } else if (photoRotateIdx !== null) {
        const cvs = canvasRef.current;
        const items = itemsRef.current;
        if (cvs && items[photoRotateIdx]) {
          const rect = cvs.getBoundingClientRect();
          const sc = cvs.width / rect.width;
          const mx = (e.clientX - rect.left) * sc;
          const my = (e.clientY - rect.top) * sc;
          const it = items[photoRotateIdx];
          const cx = it.x + it.w / 2;
          const cy = it.y + it.h / 2;
          const angle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI) + 90;
          setFreestyleItems((prev) => prev.map((iv, i) => i === photoRotateIdx ? { ...iv, rotation: angle } : iv));
        }
      } else if (textDragIdx !== null) {
        setTextLabels((prev) => prev.map((t, i) => i === textDragIdx ? { ...t, x: dragStart.current.item.x + dx, y: dragStart.current.item.y + dy } : t));
      }
      requestAnimationFrame(() => quickRender());
    };
    const handleUp = () => {
      if (mode !== "freestyle") {
        const idx = freestyleDragging ? selectedIdx : (photoDragIdx ?? photoResizeIdx ?? photoRotateIdx ?? photoPanIdx);
        if (idx !== null) {
          setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, locked: true } : item));
        }
      }
      setFreestyleDragging(false); setFreestyleResizing(false); setTextDragIdx(null); setPhotoDragIdx(null); setPhotoResizeIdx(null); setPhotoRotateIdx(null); setPhotoPanIdx(null);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [freestyleDragging, freestyleResizing, selectedIdx, textDragIdx, photoDragIdx, photoResizeIdx, photoRotateIdx, photoPanIdx, quickRender, renderToCanvas, drawOverlay, mode]);

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
                  <canvas ref={canvasRef} className="w-full rounded-lg border" style={{ minHeight: 200, maxHeight: 600, cursor: "default" }}
                    onMouseMove={(e) => {
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const scaleX = canvasRef.current!.width / rect.width;
                      const scaleY = canvasRef.current!.height / rect.height;
                      const mx = (e.clientX - rect.left) * scaleX;
                      const my = (e.clientY - rect.top) * scaleY;
                      let found = -1;
                      for (let i = freestyleItems.length - 1; i >= 0; i--) {
                        const it = freestyleItems[i];
                        if (mx >= it.x && mx <= it.x + it.w && my >= it.y && my <= it.y + it.h) { found = i; break; }
                      }
                      if (found !== hoveredRef.current) {
                        hoveredRef.current = found;
                        setHoveredIdx(found);
                        requestAnimationFrame(() => drawOverlay());
                      }
                    }}
                    onMouseLeave={() => { hoveredRef.current = null; setHoveredIdx(null); requestAnimationFrame(() => drawOverlay()); }}
                    onMouseDown={(e) => {
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const scaleX = canvasRef.current!.width / rect.width;
                      const scaleY = canvasRef.current!.height / rect.height;
                      const mx = (e.clientX - rect.left) * scaleX;
                      const my = (e.clientY - rect.top) * scaleY;
                      const ti = textLabels.findIndex((t) => Math.abs(mx - t.x) < 150 && Math.abs(my - t.y) < 50);
                      if (ti >= 0) {
                        setTextDragIdx(ti);
                        dragStart.current = { x: e.clientX, y: e.clientY, item: { x: textLabels[ti].x, y: textLabels[ti].y, w: 0, h: 0 } };
                        return;
                      }
                      let pi = -1;
                      let rotateDist = Infinity;
                      let rotateHit = -1;
                      for (let i = 0; i < freestyleItems.length; i++) {
                        const it = freestyleItems[i];
                        if (mx >= it.x && mx <= it.x + it.w && my >= it.y && my <= it.y + it.h) { pi = i; }
                        const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
                        const angleRad = (it.rotation * Math.PI) / 180;
                        const hOff = it.h / 2 + 20;
                        const hx = cx + Math.sin(angleRad) * hOff;
                        const hy = cy - Math.cos(angleRad) * hOff;
                        const d = Math.hypot(mx - hx, my - hy);
                        if (d < rotateDist) { rotateDist = d; rotateHit = d < 25 ? i : -1; }
                      }
                      let newSel = selectedIdx;
                      const redraw = () => requestAnimationFrame(() => drawOverlay());
                      if (rotateHit >= 0) {
                        newSel = rotateHit;
                        setSelectedIdx(rotateHit);
                        setPhotoRotateIdx(rotateHit);
                        dragStart.current = { x: e.clientX, y: e.clientY, item: { x: freestyleItems[rotateHit].x, y: freestyleItems[rotateHit].y, w: freestyleItems[rotateHit].w, h: freestyleItems[rotateHit].h } };
                        redraw();
                      } else if (pi >= 0) {
                        const found = freestyleItems[pi];
                        newSel = pi;
                        setSelectedIdx(pi);
                        const cornerSize = 15;
                        const isCorner = (sx: number, sy: number) => Math.abs(mx - (found.x + found.w * (sx + 1) / 2)) < cornerSize && Math.abs(my - (found.y + found.h * (sy + 1) / 2)) < cornerSize;
                        const isEdge = (ex: number, ey: number) => {
                          if (ey === -1 && ex === 0) return Math.abs(my - found.y) < 8 && mx > found.x + 10 && mx < found.x + found.w - 10;
                          if (ey === 1 && ex === 0) return Math.abs(my - (found.y + found.h)) < 8 && mx > found.x + 10 && mx < found.x + found.w - 10;
                          if (ex === -1 && ey === 0) return Math.abs(mx - found.x) < 8 && my > found.y + 10 && my < found.y + found.h - 10;
                          if (ex === 1 && ey === 0) return Math.abs(mx - (found.x + found.w)) < 8 && my > found.y + 10 && my < found.y + found.h - 10;
                          return false;
                        };
                        const corners: [number, number][] = [[-1,-1],[1,-1],[-1,1],[1,1]];
                        const edges: [number, number][] = [[0,-1],[0,1],[-1,0],[1,0]];
                        let resizeCorner: [number, number] | null = null;
                        for (const c of corners) if (isCorner(c[0], c[1])) { resizeCorner = c; break; }
                        if (!resizeCorner) { for (const e of edges) if (isEdge(e[0], e[1])) { resizeCorner = e; break; } }
                        if (resizeCorner) {
                          setPhotoResizeIdx(pi);
                        } else if (panMode) {
                          setPhotoPanIdx(pi);
                          dragStart.current = { x: mx, y: my, item: { x: found.x, y: found.y, w: found.w, h: found.h } };
                        } else {
                          setPhotoDragIdx(pi);
                        }
                        if (!panMode) dragStart.current = { x: e.clientX, y: e.clientY, item: { x: found.x, y: found.y, w: found.w, h: found.h } };
                        redraw();
                      }
                    if (selectedIdx !== null) {
                      setSelectedIdx(null);
                      requestAnimationFrame(() => drawOverlay());
                    }
                  }}
                  />
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button onClick={handleDownload} className="gap-2"><Download className="h-4 w-4" /> Download</Button>
                    <Button variant="outline" onClick={triggerUpload}><Plus className="h-4 w-4" /> Add Photos</Button>
                    {selectedIdx !== null && (
                      <Button variant={panMode ? "default" : "outline"} size="sm" onClick={() => setPanMode(!panMode)}>
                        <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l-7 7 7 7"/></svg>
                        {panMode ? "Panning" : "Pan Image"}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => bgFileRef.current?.click()} className={bgImage ? "border-primary text-primary" : ""}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      {bgImage ? "Wallpaper" : "Background"}
                    </Button>
                    <Button variant="outline" onClick={() => { setImages([]); setFiles([]); setFreestyleItems([]); setBgImage(null); setStickers([]); setTemplateStyle(null); setTextLabels([]); setEditingTextId(null); }}>Start Over</Button>
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
                        <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100">
                          <button onClick={() => rotateItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M21 3v5h-5"/></svg></button>
                          <button onClick={() => flipHItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18"/><path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/></svg></button>
                          <button onClick={() => flipVItem(idx)} className="flex-1 bg-background/80 rounded text-[10px] p-0.5"><svg className="h-2.5 w-2.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="m7 8 5-5 5 5"/><path d="m7 16 5 5 5-5"/></svg></button>
                        </div>
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
                  <Slider value={[radius]} onValueChange={([v]) => setRadius(v)} min={0} max={200} step={1} />
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
                  </div>
                )}
                <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { setBgImage(r.result as string); setBgType("image"); }; r.readAsDataURL(f); }
                }} />
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

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Text</CardTitle>
                <Button size="sm" variant="outline" onClick={addText} className="h-7 px-2 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {textLabels.length === 0 && <p className="text-xs text-muted-foreground">No text labels yet. Click "Add" to create one.</p>}
                {textLabels.map((tl) => (
                  <div key={tl.id} className={`border rounded-lg p-2 space-y-2 ${editingTextId === tl.id ? "border-primary" : ""}`}>
                    <div className="flex items-center gap-1">
                      <input
                        value={tl.text}
                        onChange={(e) => updateText(tl.id, { text: e.target.value })}
                        className="flex-1 text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-1 py-0.5"
                        placeholder="Type your text..."
                      />
                      <button onClick={() => removeText(tl.id)} className="text-destructive hover:text-destructive/80"><X className="h-3 w-3" /></button>
                    </div>
                    {editingTextId === tl.id && (
                      <div className="space-y-2 pt-1 border-t">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Size</Label>
                            <input type="number" value={tl.fontSize} onChange={(e) => updateText(tl.id, { fontSize: Math.max(8, +e.target.value) })}
                              className="w-full h-7 text-xs border rounded px-1 bg-transparent" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Spacing</Label>
                            <input type="number" value={tl.letterSpacing} onChange={(e) => updateText(tl.id, { letterSpacing: +e.target.value })}
                              className="w-full h-7 text-xs border rounded px-1 bg-transparent" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Font</Label>
                          <Select value={tl.fontFamily} onValueChange={(v) => updateText(tl.id, { fontFamily: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                              <SelectItem value="Impact">Impact</SelectItem>
                              <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                              <SelectItem value="monospace">Monospace</SelectItem>
                              <SelectItem value="serif">Serif</SelectItem>
                              <SelectItem value="sans-serif">Sans-Serif</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="space-y-1 flex-1">
                            <Label className="text-[10px]">Color</Label>
                            <input type="color" value={tl.color} onChange={(e) => updateText(tl.id, { color: e.target.value })}
                              className="w-full h-7 p-0.5 rounded border bg-transparent" />
                          </div>
                          <div className="flex items-end gap-1 pb-0.5">
                            <button onClick={() => updateText(tl.id, { bold: !tl.bold })}
                              className={`h-7 w-7 flex items-center justify-center rounded border text-xs font-bold ${tl.bold ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>B</button>
                            <button onClick={() => updateText(tl.id, { italic: !tl.italic })}
                              className={`h-7 w-7 flex items-center justify-center rounded border text-xs italic font-serif ${tl.italic ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>I</button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Effect</Label>
                          <div className="flex gap-1">
                            {(["none", "shadow", "outline", "glow"] as const).map((e) => (
                              <button key={e} onClick={() => updateText(tl.id, { effect: e })}
                                className={`flex-1 h-7 text-[10px] rounded border capitalize ${tl.effect === e ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>{e}</button>
                            ))}
                          </div>
                        </div>
                        {tl.effect !== "none" && (
                          <div className="space-y-1">
                            <Label className="text-[10px]">Effect Color</Label>
                            <input type="color" value={tl.effectColor} onChange={(e) => updateText(tl.id, { effectColor: e.target.value })}
                              className="w-full h-7 p-0.5 rounded border bg-transparent" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Horizontal</Label>
                            <div className="flex gap-0.5">
                              {(["left", "center", "right"] as const).map((a) => (
                                <button key={a} onClick={() => updateText(tl.id, { textAlign: a })}
                                  className={`flex-1 h-7 text-[10px] font-medium rounded border capitalize ${tl.textAlign === a ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>{a}</button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Vertical</Label>
                            <div className="flex gap-0.5">
                              {(["top", "middle", "bottom"] as const).map((a) => (
                                <button key={a} onClick={() => updateText(tl.id, { verticalAlign: a })}
                                  className={`flex-1 h-7 text-[10px] font-medium rounded border capitalize ${tl.verticalAlign === a ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>{a}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {editingTextId !== tl.id && (
                      <button onClick={() => setEditingTextId(tl.id)} className="text-[10px] text-muted-foreground hover:text-foreground">Click to edit</button>
                    )}
                  </div>
                ))}
                {textLabels.length > 0 && (
                  <button onClick={addText} className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg py-1.5">+ Add another text</button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
