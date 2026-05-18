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
import { preloadModel } from "@/hooks/useBackgroundRemoval";
import { useToast } from "@/components/ui/use-toast";

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

type PhotoItem = { src: string; x: number; y: number; w: number; h: number; rotation: number; flipH: boolean; flipV: boolean; offsetX: number; offsetY: number; imgScale: number; locked?: boolean; radius?: number; opacity?: number; shape?: string; borderWidth?: number; borderColor?: string; brightness?: number; contrast?: number; saturation?: number; blendMode?: GlobalCompositeOperation };

type ShapeItem = {
  id: string;
  type: "circle" | "rect" | "square" | "heart" | "diamond" | "flower" | "star" | "hexagon" | "triangle";
  x: number; y: number; w: number; h: number;
  fill: string; stroke: string; strokeWidth: number;
  rotation: number;
};

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
  imageFillIdx?: number;
};

function loadImages(srcs: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    srcs.map((src) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej; i.src = src;
    }))
  );
}

function shapeClipPath(ctx: CanvasRenderingContext2D, shape: string, w: number, h: number) {
  const cx = 0, cy = 0;
  ctx.beginPath();
  const poly = (sides: number) => {
    for (let i = 0; i < sides; i++) { const a = (i * 2 * Math.PI) / sides - Math.PI / 2; ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2); }
    ctx.closePath();
  };
  const starFn = (points: number, innerRatio = 0.4) => {
    for (let i = 0; i < points * 2; i++) { const a = (i * Math.PI) / points - Math.PI / 2; const r = i % 2 === 0 ? w / 2 : w / 2 * innerRatio; ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath();
  };
  const burst = (rays: number) => {
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * 0.3;
    for (let i = 0; i < rays * 2; i++) { const a = (i * Math.PI) / rays - Math.PI / 2; const r = i % 2 === 0 ? outerR : innerR; ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath();
  };
  if (shape === "circle") { ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); }
  else if (shape === "diamond") { ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy); ctx.lineTo(cx, cy + h / 2); ctx.lineTo(cx - w / 2, cy); ctx.closePath(); }
  else if (shape === "triangle" || shape === "poly_3") { poly(3); }
  else if (shape === "square" || shape === "poly_4") { poly(4); }
  else if (shape === "pentagon" || shape === "poly_5") { poly(5); }
  else if (shape === "hexagon" || shape === "poly_6") { poly(6); }
  else if (shape === "heptagon" || shape === "poly_7") { poly(7); }
  else if (shape === "octagon" || shape === "poly_8") { poly(8); }
  else if (shape === "nonagon" || shape === "poly_9") { poly(9); }
  else if (shape === "decagon" || shape === "poly_10") { poly(10); }
  else if (shape.startsWith("poly_")) { const n = parseInt(shape.split("_")[1], 10); if (n >= 3 && n <= 30) poly(n); }
  else if (shape === "star" || shape === "star_5") { starFn(5); }
  else if (shape === "star4" || shape === "star_4") { starFn(4, 0.3); }
  else if (shape === "star6" || shape === "star_6") { starFn(6, 0.35); }
  else if (shape === "star7" || shape === "star_7") { starFn(7); }
  else if (shape === "star8" || shape === "star_8") { starFn(8); }
  else if (shape.startsWith("star_")) { const n = parseInt(shape.split("_")[1], 10); if (n >= 3 && n <= 20) starFn(n); }
  else if (shape.startsWith("burst_")) { const n = parseInt(shape.split("_")[1], 10); if (n >= 4 && n <= 24) burst(n); }
  else if (shape === "heart") {
    ctx.moveTo(cx, cy + h / 4); ctx.bezierCurveTo(cx - w / 2, cy - h / 4, cx - w / 2, cy - h / 2, cx, cy - h / 4);
    ctx.bezierCurveTo(cx + w / 2, cy - h / 2, cx + w / 2, cy - h / 4, cx, cy + h / 4);
  } else if (shape === "flower") {
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.ellipse(cx + Math.cos(a) * w / 4, cy + Math.sin(a) * h / 4, w / 4, h / 6, a, 0, Math.PI * 2); }
  } else if (shape === "cross") {
    const t = Math.min(w, h) * 0.25;
    ctx.moveTo(cx - t, cy - h / 2); ctx.lineTo(cx + t, cy - h / 2); ctx.lineTo(cx + t, cy - t);
    ctx.lineTo(cx + w / 2, cy - t); ctx.lineTo(cx + w / 2, cy + t); ctx.lineTo(cx + t, cy + t);
    ctx.lineTo(cx + t, cy + h / 2); ctx.lineTo(cx - t, cy + h / 2); ctx.lineTo(cx - t, cy + t);
    ctx.lineTo(cx - w / 2, cy + t); ctx.lineTo(cx - w / 2, cy - t); ctx.lineTo(cx - t, cy - t);
    ctx.closePath();
  } else if (shape === "plus") {
    const t = Math.min(w, h) * 0.3;
    ctx.moveTo(cx - t, cy - h / 2); ctx.lineTo(cx + t, cy - h / 2); ctx.lineTo(cx + t, cy - t);
    ctx.lineTo(cx + w / 2, cy - t); ctx.lineTo(cx + w / 2, cy + t); ctx.lineTo(cx + t, cy + t);
    ctx.lineTo(cx + t, cy + h / 2); ctx.lineTo(cx - t, cy + h / 2); ctx.lineTo(cx - t, cy + t);
    ctx.lineTo(cx - w / 2, cy + t); ctx.lineTo(cx - w / 2, cy - t); ctx.lineTo(cx - t, cy - t);
    ctx.closePath();
  } else if (shape === "arrow") {
    ctx.moveTo(cx - w / 2, cy); ctx.lineTo(cx, cy - h / 2); ctx.lineTo(cx, cy - h / 4);
    ctx.lineTo(cx + w / 2, cy - h / 4); ctx.lineTo(cx + w / 2, cy + h / 4);
    ctx.lineTo(cx, cy + h / 4); ctx.lineTo(cx, cy + h / 2); ctx.closePath();
  } else if (shape === "arrow-up") {
    ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy); ctx.lineTo(cx + w / 4, cy);
    ctx.lineTo(cx + w / 4, cy + h / 2); ctx.lineTo(cx - w / 4, cy + h / 2);
    ctx.lineTo(cx - w / 4, cy); ctx.lineTo(cx - w / 2, cy); ctx.closePath();
  } else if (shape === "arrow-down") {
    ctx.moveTo(cx, cy + h / 2); ctx.lineTo(cx + w / 2, cy); ctx.lineTo(cx + w / 4, cy);
    ctx.lineTo(cx + w / 4, cy - h / 2); ctx.lineTo(cx - w / 4, cy - h / 2);
    ctx.lineTo(cx - w / 4, cy); ctx.lineTo(cx - w / 2, cy); ctx.closePath();
  } else if (shape === "cloud") {
    ctx.ellipse(cx - w * 0.2, cy + h * 0.1, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.25, cy + h * 0.15, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.1, cy - h * 0.2, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - w * 0.15, cy - h * 0.15, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
  } else if (shape === "moon") {
    ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.arc(cx + w * 0.25, cy - h * 0.1, Math.min(w, h) * 0.4, 0, Math.PI * 2, true);
  } else if (shape === "ring") {
    ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.moveTo(cx + Math.min(w, h) * 0.3, cy);
    ctx.arc(cx, cy, Math.min(w, h) * 0.3, 0, Math.PI * 2, true);
  } else if (shape === "drop") {
    ctx.moveTo(cx, cy - h / 2); ctx.bezierCurveTo(cx + w / 2, cy - h / 6, cx + w / 2, cy + h / 4, cx, cy + h / 2);
    ctx.bezierCurveTo(cx - w / 2, cy + h / 4, cx - w / 2, cy - h / 6, cx, cy - h / 2);
  } else if (shape === "shield") {
    ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy - h / 2); ctx.lineTo(cx + w / 2, cy);
    ctx.quadraticCurveTo(cx + w / 2, cy + h / 3, cx, cy + h / 2);
    ctx.quadraticCurveTo(cx - w / 2, cy + h / 3, cx - w / 2, cy); ctx.lineTo(cx - w / 2, cy - h / 2); ctx.closePath();
  } else if (shape === "bolt") {
    ctx.moveTo(cx + w * 0.2, cy - h / 2); ctx.lineTo(cx - w * 0.25, cy + h * 0.05);
    ctx.lineTo(cx + w * 0.05, cy + h * 0.05); ctx.lineTo(cx - w * 0.2, cy + h / 2);
    ctx.lineTo(cx + w * 0.25, cy - h * 0.05); ctx.lineTo(cx - w * 0.05, cy - h * 0.05); ctx.closePath();
  } else if (shape === "crown") {
    ctx.moveTo(cx - w / 2, cy + h / 2); ctx.lineTo(cx - w / 2, cy - h / 4);
    ctx.lineTo(cx - w * 0.2, cy); ctx.lineTo(cx, cy - h / 2); ctx.lineTo(cx + w * 0.2, cy);
    ctx.lineTo(cx + w / 2, cy - h / 4); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.closePath();
  } else if (shape === "leaf") {
    ctx.moveTo(cx, cy - h / 2); ctx.bezierCurveTo(cx + w / 2, cy - h / 4, cx + w / 2, cy + h / 4, cx, cy + h / 2);
    ctx.bezierCurveTo(cx - w / 2, cy + h / 4, cx - w / 2, cy - h / 4, cx, cy - h / 2);
  } else if (shape === "sun") {
    ctx.arc(cx, cy, Math.min(w, h) * 0.2, 0, Math.PI * 2);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.moveTo(cx + Math.cos(a) * Math.min(w, h) * 0.25, cy + Math.sin(a) * Math.min(w, h) * 0.25); ctx.lineTo(cx + Math.cos(a) * Math.min(w, h) * 0.45, cy + Math.sin(a) * Math.min(w, h) * 0.45); }
  } else if (shape === "wave") {
    ctx.moveTo(cx - w / 2, cy); for (let i = 0; i <= 10; i++) { const x = cx - w / 2 + (w * i) / 10; const y = cy + Math.sin((i * Math.PI) / 2.5) * h * 0.4; ctx.lineTo(x, y); }
    ctx.lineTo(cx + w / 2, cy + h / 2); ctx.lineTo(cx - w / 2, cy + h / 2); ctx.closePath();
  } else if (shape === "clover") {
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; ctx.ellipse(cx + Math.cos(a) * w * 0.22, cy + Math.sin(a) * h * 0.22, w * 0.25, h * 0.25, a, 0, Math.PI * 2); }
    ctx.ellipse(cx, cy, w * 0.12, h * 0.12, 0, 0, Math.PI * 2);
  } else if (shape === "egg") {
    ctx.ellipse(cx, cy + h * 0.06, w * 0.4, h * 0.45, 0, 0, Math.PI * 2);
  } else if (shape === "eye") {
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.moveTo(cx + w * 0.15, cy);
    ctx.ellipse(cx, cy, w * 0.15, h * 0.25, 0, 0, Math.PI * 2, true);
  } else if (shape === "paw") {
    ctx.ellipse(cx - w * 0.2, cy - h * 0.25, w * 0.2, h * 0.25, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.2, cy - h * 0.25, w * 0.2, h * 0.25, 0.3, 0, Math.PI * 2);
    ctx.ellipse(cx, cy - h * 0.3, w * 0.22, h * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + h * 0.15, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
  } else if (shape === "pin") {
    ctx.moveTo(cx, cy - h / 2); ctx.arc(cx, cy - h * 0.12, w * 0.3, 0.3, Math.PI - 0.3, false);
    ctx.lineTo(cx, cy + h / 2); ctx.closePath();
  } else if (shape === "smile") {
    ctx.arc(cx, cy, Math.min(w, h) * 0.4, 0, Math.PI * 2);
    ctx.moveTo(cx - w * 0.15, cy - h * 0.05);
    ctx.arc(cx, cy, Math.min(w, h) * 0.2, 0.2, Math.PI - 0.2, false);
  } else if (shape === "snow") {
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2); ctx.moveTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * h * 0.3); ctx.lineTo(cx + Math.cos(a + 0.5) * w * 0.45, cy + Math.sin(a + 0.5) * h * 0.45); ctx.moveTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * h * 0.3); ctx.lineTo(cx + Math.cos(a - 0.5) * w * 0.45, cy + Math.sin(a - 0.5) * h * 0.45); }
  } else if (shape === "tear") {
    ctx.moveTo(cx, cy - h / 2); ctx.quadraticCurveTo(cx + w / 2, cy, cx, cy + h / 2);
    ctx.quadraticCurveTo(cx - w / 2, cy, cx, cy - h / 2);
  } else if (shape === "infinity") {
    ctx.moveTo(cx - w * 0.3, cy); ctx.arc(cx - w * 0.1, cy, w * 0.25, Math.PI, -Math.PI, true);
    ctx.arc(cx + w * 0.1, cy, w * 0.25, Math.PI, -Math.PI, true);
  } else {
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  }
}

function shapeToChar(shape: string): string {
  if (shape.startsWith("num_")) return shape.split("_")[1] || "";
  if (shape.startsWith("letter_")) return shape.split("_")[1] || "";
  if (shape === "animal_dog") return "🐕";
  if (shape === "animal_cat") return "🐈";
  if (shape === "animal_mouse") return "🐁";
  if (shape === "animal_bird") return "🐦";
  if (shape === "animal_fish") return "🐟";
  if (shape === "animal_rabbit") return "🐇";
  if (shape === "animal_bear") return "🐻";
  if (shape === "animal_lion") return "🦁";
  if (shape === "animal_monkey") return "🐒";
  if (shape === "animal_fox") return "🦊";
  if (shape === "animal_panda") return "🐼";
  if (shape === "animal_koala") return "🐨";
  if (shape === "animal_frog") return "🐸";
  if (shape === "animal_pig") return "🐷";
  if (shape === "animal_cow") return "🐄";
  return "";
}

function isTextShape(shape?: string): boolean {
  if (!shape) return false;
  return shape.startsWith("num_") || shape.startsWith("letter_") || shape.startsWith("animal_");
}

const NAMED_SHAPES = [
  { value: "", label: "None", icon: "□" },
  { value: "rect", label: "Rounded Rect", icon: "▭" },
  { value: "circle", label: "Circle", icon: "○" },
  { value: "square", label: "Square", icon: "▣" },
  { value: "diamond", label: "Diamond", icon: "◆" },
  { value: "heart", label: "Heart", icon: "♥" },
  { value: "flower", label: "Flower", icon: "✿" },
  { value: "cross", label: "Cross", icon: "✚" },
  { value: "plus", label: "Plus", icon: "⊕" },
  { value: "drop", label: "Drop", icon: "💧" },
  { value: "shield", label: "Shield", icon: "🛡" },
  { value: "bolt", label: "Bolt", icon: "⚡" },
  { value: "crown", label: "Crown", icon: "♛" },
  { value: "leaf", label: "Leaf", icon: "🍂" },
  { value: "sun", label: "Sun", icon: "☀" },
  { value: "moon", label: "Moon", icon: "☾" },
  { value: "cloud", label: "Cloud", icon: "☁" },
  { value: "ring", label: "Ring", icon: "◎" },
  { value: "arrow", label: "Arrow", icon: "➤" },
  { value: "arrow-up", label: "Arrow Up", icon: "▲" },
  { value: "arrow-down", label: "Arrow Down", icon: "▼" },
  { value: "clover", label: "Clover", icon: "☘" },
  { value: "egg", label: "Egg", icon: "🥚" },
  { value: "eye", label: "Eye", icon: "◉" },
  { value: "paw", label: "Paw", icon: "🐾" },
  { value: "pin", label: "Pin", icon: "📍" },
  { value: "smile", label: "Smile", icon: "☺" },
  { value: "snow", label: "Snowflake", icon: "❄" },
  { value: "tear", label: "Tear", icon: "💧" },
  { value: "wave", label: "Wave", icon: "〰" },
  { value: "infinity", label: "Infinity", icon: "∞" },
  ...Array.from({ length: 10 }, (_, i) => ({ value: `num_${i}`, label: `Number ${i}`, icon: `${i}` })),
  ...Array.from({ length: 26 }, (_, i) => ({ value: `letter_${String.fromCharCode(65 + i)}`, label: `Letter ${String.fromCharCode(65 + i)}`, icon: `${String.fromCharCode(65 + i)}` })),
  { value: "animal_dog", label: "Dog", icon: "🐕" },
  { value: "animal_cat", label: "Cat", icon: "🐈" },
  { value: "animal_mouse", label: "Mouse", icon: "🐁" },
  { value: "animal_bird", label: "Bird", icon: "🐦" },
  { value: "animal_fish", label: "Fish", icon: "🐟" },
  { value: "animal_rabbit", label: "Rabbit", icon: "🐇" },
  { value: "animal_bear", label: "Bear", icon: "🐻" },
  { value: "animal_lion", label: "Lion", icon: "🦁" },
  { value: "animal_monkey", label: "Monkey", icon: "🐒" },
  { value: "animal_fox", label: "Fox", icon: "🦊" },
  { value: "animal_panda", label: "Panda", icon: "🐼" },
  { value: "animal_koala", label: "Koala", icon: "🐨" },
  { value: "animal_frog", label: "Frog", icon: "🐸" },
  { value: "animal_pig", label: "Pig", icon: "🐷" },
  { value: "animal_cow", label: "Cow", icon: "🐄" },
];

function genShapes(): { value: string; label: string; icon: string }[] {
  const r: { value: string; label: string; icon: string }[] = [];
  for (let n = 3; n <= 24; n++) {
    r.push({ value: `poly_${n}`, label: `${n}-gon`, icon: "⬡" });
  }
  for (let n = 3; n <= 16; n++) {
    r.push({ value: `star_${n}`, label: `${n}-Point Star`, icon: "★" });
  }
  for (let n = 4; n <= 20; n += 2) {
    r.push({ value: `burst_${n}`, label: `${n}-Ray Burst`, icon: "✸" });
  }
  return [...NAMED_SHAPES, ...r];
}
const SHAPES = genShapes();

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
  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [shapeDragIdx, setShapeDragIdx] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(100);
  const [processingBg, setProcessingBg] = useState<Record<number, boolean>>({});
  const [bgAllProcessing, setBgAllProcessing] = useState(false);
  const [bgAllProgress, setBgAllProgress] = useState({ current: 0, total: 0 });
  const [renderTrigger, setRenderTrigger] = useState(0);
  const { toast } = useToast();
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
  const resizeDirRef = useRef<{ sx: number; sy: number } | null>(null);

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

  const removeBgFromImage = useCallback(async (idx: number) => {
    const src = images[idx];
    if (!src || processingBg[idx]) return;
    setProcessingBg((prev) => ({ ...prev, [idx]: true }));
    try {
      await preloadModel();
      const mod = await import("@imgly/background-removal");
      const resizedImg = new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let w = img.width, h = img.height;
          if (w <= maxDim && h <= maxDim) {
            fetch(src).then((r) => r.blob()).then(resolve).catch(reject);
            return;
          }
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale);
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d")!.drawImage(img, 0, 0, w, h);
          c.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/jpeg", 0.85);
        };
        img.onerror = () => reject(new Error("Failed to load image for resize"));
        img.src = src;
      });
      const resizedBlob = await resizedImg;
      const blob = await mod.removeBackground(resizedBlob, { model: "isnet", output: { format: "image/png", quality: 1 } });
      const url = URL.createObjectURL(blob);
      setImages((prev) => prev.map((s, i) => i === idx ? url : s));
      setFreestyleItems((prev) => prev.map((item, i) => i === idx ? { ...item, src: url } : item));
      setRenderTrigger((k) => k + 1);
    } catch (err) {
      console.error("BG removal failed for image", idx, err);
      toast({ title: "Background removal failed", description: String(err).slice(0, 120), variant: "destructive" });
    } finally {
      setProcessingBg((prev) => ({ ...prev, [idx]: false }));
    }
  }, [images, processingBg, toast]);

  const removeBgFromAll = useCallback(async () => {
    const idxs = images.map((_, i) => i);
    setBgAllProcessing(true);
    setBgAllProgress({ current: 0, total: idxs.length });
    for (let i = 0; i < idxs.length; i++) {
      await removeBgFromImage(idxs[i]);
      setBgAllProgress({ current: i + 1, total: idxs.length });
    }
    setBgAllProcessing(false);
  }, [images, removeBgFromImage]);

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
      const itemRadius = item.radius ?? radius;
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      ctx.globalAlpha = (item.opacity ?? 100) / 100;
      ctx.save();
      const tShape = isTextShape(item.shape);
      let drewPhoto = false;
      if (item.shape && !tShape && item.shape !== "rect") {
        shapeClipPath(ctx, item.shape, item.w, item.h); ctx.clip();
      } else if (tShape) {
        drewPhoto = true;
        const ch = shapeToChar(item.shape!);
        const oc = document.createElement('canvas');
        oc.width = Math.ceil(item.w); oc.height = Math.ceil(item.h);
        const octx = oc.getContext('2d')!;
        octx.fillStyle = bgColor; octx.fillRect(0, 0, oc.width, oc.height);
        octx.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
        octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillStyle = '#fff';
        octx.fillText(ch, oc.width / 2, oc.height / 2);
        octx.globalCompositeOperation = 'source-in';
        const so = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const oX = (item.offsetX || 0) * so; const oY = (item.offsetY || 0) * so;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { octx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        octx.drawImage(img, (oc.width - img.width * so) / 2 + oX, (oc.height - img.height * so) / 2 + oY, img.width * so, img.height * so);
        octx.filter = 'none'; octx.globalCompositeOperation = 'source-over';
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        ctx.drawImage(oc, -item.w / 2, -item.h / 2);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, itemRadius); ctx.clip();
      }
      if (!drewPhoto) {
        const sc = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const offX = (item.offsetX || 0) * sc;
        const offY = (item.offsetY || 0) * sc;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { ctx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        ctx.drawImage(img, -img.width * sc / 2 + offX, -img.height * sc / 2 + offY, img.width * sc, img.height * sc);
      }
      ctx.filter = 'none';
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const bw = item.borderWidth ?? 0;
      if (bw > 0) {
        ctx.save();
        if (tShape) {
          const ch = shapeToChar(item.shape!);
          ctx.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.strokeText(ch, 0, 0);
        } else if (item.shape && item.shape !== "rect") {
          shapeClipPath(ctx, item.shape, item.w, item.h);
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.stroke();
        } else {
          ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, itemRadius);
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.stroke();
        }
        ctx.restore();
      }
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
        ctx.fillStyle = t.imageFillIdx !== undefined ? '#ffffff' : t.color;
        let cx = lineOffX;
        if (t.effect === "glow") { ctx.shadowColor = t.effectColor; ctx.shadowBlur = 15; }
        for (const ch of chars) { ctx.fillText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      if (t.imageFillIdx !== undefined) {
        const fillImg = loaded[t.imageFillIdx];
        if (fillImg && fillImg.width && fillImg.height) {
          const minOffX = Math.min(...lineWidths.map((w) => t.textAlign === "center" ? -w / 2 : t.textAlign === "right" ? -w : 0));
          ctx.globalCompositeOperation = 'source-in';
          const sc = Math.max(maxW / fillImg.width, totalH / fillImg.height);
          const imgW = fillImg.width * sc;
          const imgH = fillImg.height * sc;
          ctx.drawImage(fillImg, minOffX + (maxW - imgW) / 2, (totalH - imgH) / 2, imgW, imgH);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    for (const s of shapes) {
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.fillStyle = s.fill;
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = s.strokeWidth;
      ctx.beginPath();
      if (s.type === "circle") { ctx.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, Math.PI * 2); }
      else if (s.type === "rect" || s.type === "square") { ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 4); }
      else if (s.type === "diamond") {
        ctx.moveTo(0, -s.h / 2); ctx.lineTo(s.w / 2, 0); ctx.lineTo(0, s.h / 2); ctx.lineTo(-s.w / 2, 0); ctx.closePath();
      } else if (s.type === "triangle") {
        ctx.moveTo(0, -s.h / 2); ctx.lineTo(s.w / 2, s.h / 2); ctx.lineTo(-s.w / 2, s.h / 2); ctx.closePath();
      } else if (s.type === "star") {
        for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2; const r = i % 2 === 0 ? s.w / 2 : s.w / 4; ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath();
      } else if (s.type === "hexagon") {
        for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 - Math.PI / 6; ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * s.w / 2, Math.sin(a) * s.h / 2); }
        ctx.closePath();
      } else if (s.type === "heart") {
        ctx.moveTo(0, s.h / 4); ctx.bezierCurveTo(-s.w / 2, -s.h / 4, -s.w / 2, -s.h / 2, 0, -s.h / 4);
        ctx.bezierCurveTo(s.w / 2, -s.h / 2, s.w / 2, -s.h / 4, 0, s.h / 4);
      } else if (s.type === "flower") {
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.ellipse(Math.cos(a) * s.w / 4, Math.sin(a) * s.h / 4, s.w / 4, s.h / 6, a, 0, Math.PI * 2); }
      }
      ctx.fill();
      if (s.strokeWidth > 0) ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }, [images, mode, cols, gap, radius, padding, bgType, bgColor, bgColor2, bgGradDir, bgImage, canvasW, canvasH, splitDir, splitRatio, bentoPreset, socialPreset, masonryCols, freestyleItems, textLabels, shapes]);

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
      const hs = 12;
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
        const ex = sx * (item.w / 2) - 6;
        const ey = sy * (item.h / 2) - 6;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.fillRect(ex, ey, 12, 12);
        ctx.strokeRect(ex, ey, 12, 12);
      }
      ctx.beginPath();
      ctx.arc(0, -item.h / 2 - 20, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
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
      const itemRadius = item.radius ?? radius;
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      ctx.globalAlpha = (item.opacity ?? 100) / 100;
      ctx.save();
      const tShape = isTextShape(item.shape);
      let drewPhoto = false;
      if (item.shape && !tShape && item.shape !== "rect") {
        shapeClipPath(ctx, item.shape, item.w, item.h); ctx.clip();
      } else if (tShape) {
        drewPhoto = true;
        const ch = shapeToChar(item.shape!);
        const oc = document.createElement('canvas');
        oc.width = Math.ceil(item.w); oc.height = Math.ceil(item.h);
        const octx = oc.getContext('2d')!;
        octx.fillStyle = bgColor; octx.fillRect(0, 0, oc.width, oc.height);
        octx.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
        octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillStyle = '#fff';
        octx.fillText(ch, oc.width / 2, oc.height / 2);
        octx.globalCompositeOperation = 'source-in';
        const so = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const oX = (item.offsetX || 0) * so; const oY = (item.offsetY || 0) * so;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { octx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        octx.drawImage(img, (oc.width - img.width * so) / 2 + oX, (oc.height - img.height * so) / 2 + oY, img.width * so, img.height * so);
        octx.filter = 'none'; octx.globalCompositeOperation = 'source-over';
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        ctx.drawImage(oc, -item.w / 2, -item.h / 2);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, itemRadius); ctx.clip();
      }
      if (!drewPhoto) {
        const sc = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const offX = (item.offsetX || 0) * sc;
        const offY = (item.offsetY || 0) * sc;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { ctx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        ctx.drawImage(img, -img.width * sc / 2 + offX, -img.height * sc / 2 + offY, img.width * sc, img.height * sc);
      }
      ctx.filter = 'none';
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const bw = item.borderWidth ?? 0;
      if (bw > 0) {
        ctx.save();
        if (tShape) {
          const ch = shapeToChar(item.shape!);
          ctx.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.strokeText(ch, 0, 0);
        } else if (item.shape && item.shape !== "rect") {
          shapeClipPath(ctx, item.shape, item.w, item.h);
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.stroke();
        } else {
          ctx.beginPath(); ctx.roundRect(-item.w / 2, -item.h / 2, item.w, item.h, itemRadius);
          ctx.strokeStyle = item.borderColor || "#ffffff"; ctx.lineWidth = bw;
          ctx.stroke();
        }
        ctx.restore();
      }
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
        ctx.fillStyle = t.imageFillIdx !== undefined ? '#ffffff' : t.color;
        let cx = lineOffX;
        if (t.effect === "glow") { ctx.shadowColor = t.effectColor; ctx.shadowBlur = 15; }
        for (const ch of chars) { ctx.fillText(ch, cx, ly); cx += ctx.measureText(ch).width + t.letterSpacing; }
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      if (t.imageFillIdx !== undefined) {
        const fillImg = loaded[t.imageFillIdx];
        if (fillImg && fillImg.width && fillImg.height) {
          const minOffX = Math.min(...lineWidths.map((w) => t.textAlign === "center" ? -w / 2 : t.textAlign === "right" ? -w : 0));
          ctx.globalCompositeOperation = 'source-in';
          const sc = Math.max(maxW / fillImg.width, totalH / fillImg.height);
          const imgW = fillImg.width * sc;
          const imgH = fillImg.height * sc;
          ctx.drawImage(fillImg, minOffX + (maxW - imgW) / 2, (totalH - imgH) / 2, imgW, imgH);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 1;
    for (const s of shapes) {
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.fillStyle = s.fill;
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = s.strokeWidth;
      ctx.beginPath();
      if (s.type === "circle") { ctx.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, Math.PI * 2); }
      else if (s.type === "rect" || s.type === "square") { ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 4); }
      else if (s.type === "diamond") {
        ctx.moveTo(0, -s.h / 2); ctx.lineTo(s.w / 2, 0); ctx.lineTo(0, s.h / 2); ctx.lineTo(-s.w / 2, 0); ctx.closePath();
      } else if (s.type === "triangle") {
        ctx.moveTo(0, -s.h / 2); ctx.lineTo(s.w / 2, s.h / 2); ctx.lineTo(-s.w / 2, s.h / 2); ctx.closePath();
      } else if (s.type === "star") {
        for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2; const r = i % 2 === 0 ? s.w / 2 : s.w / 4; ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath();
      } else if (s.type === "hexagon") {
        for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 - Math.PI / 6; ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * s.w / 2, Math.sin(a) * s.h / 2); }
        ctx.closePath();
      } else if (s.type === "heart") {
        ctx.moveTo(0, s.h / 4); ctx.bezierCurveTo(-s.w / 2, -s.h / 4, -s.w / 2, -s.h / 2, 0, -s.h / 4);
        ctx.bezierCurveTo(s.w / 2, -s.h / 2, s.w / 2, -s.h / 4, 0, s.h / 4);
      } else if (s.type === "flower") {
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.ellipse(Math.cos(a) * s.w / 4, Math.sin(a) * s.h / 4, s.w / 4, s.h / 6, a, 0, Math.PI * 2); }
      }
      ctx.fill();
      if (s.strokeWidth > 0) ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    drawOverlay();
  }, [mode, canvasW, canvasH, bgType, bgColor, bgColor2, bgGradDir, bgImage, padding, radius, freestyleItems, textLabels, shapes, drawOverlay]);

  const prevImageLenRef = useRef(0);
  const prevTriggerRef = useRef(0);
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
    const bgChanged = prevTriggerRef.current !== renderTrigger;
    if (prevImageLenRef.current !== images.length || cachedImagesRef.current.length === 0 || bgChanged) {
      prevImageLenRef.current = images.length;
      prevTriggerRef.current = renderTrigger;
      renderToCanvas().then(() => drawOverlay());
    } else if (!isDraggingRef.current) {
      quickRender();
    }
  }, [renderToCanvas, images.length, quickRender, drawOverlay, mode, gap, padding, cols, masonryCols, bentoPreset, splitDir, splitRatio, canvasW, canvasH, socialPreset, renderTrigger]);

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
        const dir = resizeDirRef.current || { sx: 1, sy: 1 };
        setFreestyleItems((prev) => prev.map((item, i) => {
          if (i !== idx) return item;
          const minW = 50;
          const minH = 50;
          let newX = item.x;
          let newY = item.y;
          let newW = dragStart.current.item.w;
          let newH = dragStart.current.item.h;
          if (dir.sx === 1) { newW = Math.max(minW, dragStart.current.item.w + dx); }
          else if (dir.sx === -1) { newW = Math.max(minW, dragStart.current.item.w - dx); newX = item.x + dragStart.current.item.w - newW; }
          if (dir.sy === 1) { newH = Math.max(minH, dragStart.current.item.h + dy); }
          else if (dir.sy === -1) { newH = Math.max(minH, dragStart.current.item.h - dy); newY = item.y + dragStart.current.item.h - newH; }
          if (dir.sx === 0) { newW = item.w; newX = item.x; }
          if (dir.sy === 0) { newH = item.h; newY = item.y; }
          return { ...item, x: newX, y: newY, w: newW, h: newH };
        }));
      } else if (photoRotateIdx !== null) {
        const cvs = canvasRef.current;
        const items = itemsRef.current;
        if (cvs && items[photoRotateIdx]) {
          const rect = cvs.getBoundingClientRect();
          const sc = cvs.width / rect.width;
          const mx = (e.clientX - rect.left) * sc;
          const my = (e.clientY - rect.top) * sc;
          const cx = dragStart.current.item.x;
          const cy = dragStart.current.item.y;
          const currentAngle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI);
          const startAngle = dragStart.current.item.w;
          const initialRotation = dragStart.current.item.h;
          setFreestyleItems((prev) => prev.map((iv, i) => i === photoRotateIdx ? { ...iv, rotation: initialRotation + (currentAngle - startAngle) } : iv));
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
      resizeDirRef.current = null;
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
                        if (d < rotateDist) { rotateDist = d; rotateHit = d < 35 ? i : -1; }
                      }
                      let newSel = selectedIdx;
                      const redraw = () => requestAnimationFrame(() => drawOverlay());
                        if (rotateHit >= 0) {
                          newSel = rotateHit;
                          setSelectedIdx(rotateHit);
                          setPhotoRotateIdx(rotateHit);
                          const it = freestyleItems[rotateHit];
                          const cx = it.x + it.w / 2;
                          const cy = it.y + it.h / 2;
                          const angleRad = (it.rotation * Math.PI) / 180;
                          const hOff = it.h / 2 + 20;
                          const hx = cx + Math.sin(angleRad) * hOff;
                          const hy = cy - Math.cos(angleRad) * hOff;
                          dragStart.current = { x: mx, y: my, item: { x: cx, y: cy, w: Math.atan2(my - cy, mx - cx) * (180 / Math.PI), h: it.rotation } };
                          redraw();
                        } else if (pi >= 0) {
                         const found = freestyleItems[pi];
                         newSel = pi;
                         setSelectedIdx(pi);
                         const cornerSize = 20;
                         const edgeSize = 12;
                         const isCorner = (sx: number, sy: number) => Math.abs(mx - (found.x + found.w * (sx + 1) / 2)) < cornerSize && Math.abs(my - (found.y + found.h * (sy + 1) / 2)) < cornerSize;
                         const isEdge = (ex: number, ey: number) => {
                           if (ey === -1 && ex === 0) return Math.abs(my - found.y) < edgeSize && mx > found.x + 15 && mx < found.x + found.w - 15;
                           if (ey === 1 && ex === 0) return Math.abs(my - (found.y + found.h)) < edgeSize && mx > found.x + 15 && mx < found.x + found.w - 15;
                           if (ex === -1 && ey === 0) return Math.abs(mx - found.x) < edgeSize && my > found.y + 15 && my < found.y + found.h - 15;
                           if (ex === 1 && ey === 0) return Math.abs(mx - (found.x + found.w)) < edgeSize && my > found.y + 15 && my < found.y + found.h - 15;
                           return false;
                         };
                        const corners: [number, number][] = [[-1,-1],[1,-1],[-1,1],[1,1]];
                        const edges: [number, number][] = [[0,-1],[0,1],[-1,0],[1,0]];
                        let resizeCorner: [number, number] | null = null;
                        for (const c of corners) if (isCorner(c[0], c[1])) { resizeCorner = c; break; }
                        if (!resizeCorner) { for (const e of edges) if (isEdge(e[0], e[1])) { resizeCorner = e; break; } }
                         if (resizeCorner) {
                           setPhotoResizeIdx(pi);
                           resizeDirRef.current = { sx: resizeCorner[0], sy: resizeCorner[1] };
                         } else if (panMode) {
                          setPhotoPanIdx(pi);
                          dragStart.current = { x: mx, y: my, item: { x: found.x, y: found.y, w: found.w, h: found.h } };
                        } else {
                          setPhotoDragIdx(pi);
                        }
                        if (!panMode) dragStart.current = { x: e.clientX, y: e.clientY, item: { x: found.x, y: found.y, w: found.w, h: found.h } };
                        redraw();
                      }
                      if (rotateHit < 0 && pi < 0) {
                        if (selectedIdx !== null) {
                          setSelectedIdx(null);
                          requestAnimationFrame(() => drawOverlay());
                        }
                      }
                  }}
                  />
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <div className="flex gap-1">
                      <Button onClick={() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        canvas.toBlob((blob) => {
                          if (!blob) return;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url; a.download = "collage.png"; a.click();
                          URL.revokeObjectURL(url);
                        }, "image/png");
                      }} className="gap-2"><Download className="h-4 w-4" /> PNG</Button>
                      <Select onValueChange={(fmt) => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const mime = fmt === "jpg" || fmt === "jpeg" ? "image/jpeg" : "image/png";
                        const ext = fmt === "jpeg" || fmt === "jpg" ? "jpg" : fmt;
                        if (fmt === "svg") {
                          const d = canvas.toDataURL("image/png");
                          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image width="${canvas.width}" height="${canvas.height}" href="${d}"/></svg>`;
                          const b = new Blob([svg], { type: "image/svg+xml" });
                          const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "collage.svg"; a.click(); URL.revokeObjectURL(u);
                        } else if (fmt === "pdf") {
                          const d = canvas.toDataURL("image/png");
                          const pdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${canvas.width} ${canvas.height}]/Contents 4 0 R/Resources<</XObject<</Img5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nq ${canvas.width} 0 0 ${canvas.height} 0 0 cm /Img5 Do Q\nendstream\nendobj\n5 0 obj<</Type/XObject/Subtype/Image/Width ${canvas.width}/Height ${canvas.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Length ${d.length}/Filter/ASCII85Decode>>stream\n${btoa(d)}\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000362 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n536\n%%EOF`;
                          const b = new Blob([pdf], { type: "application/pdf" });
                          const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "collage.pdf"; a.click(); URL.revokeObjectURL(u);
                        } else if (fmt === "word") {
                          const d = canvas.toDataURL("image/png");
                          const html = `<html><body><img src="${d}" style="width:100%"/></body></html>`;
                          const b = new Blob([html], { type: "application/msword" });
                          const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "collage.doc"; a.click(); URL.revokeObjectURL(u);
                        } else {
                          canvas.toBlob((blob) => {
                            if (!blob) return;
                            const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = `collage.${ext}`; a.click(); URL.revokeObjectURL(u);
                          }, mime, fmt === "jpg" ? 0.92 : undefined);
                        }
                      }}>
                        <SelectTrigger className="h-9 w-20 text-xs"><SelectValue placeholder="More" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jpg">JPG</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="word">WORD</SelectItem>
                          <SelectItem value="svg">SVG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    {selectedIdx !== null && (
                      <Button variant="default" size="sm" onClick={() => removeBgFromImage(selectedIdx)} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {processingBg[selectedIdx] ? "..." : "Remove BG"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={removeBgFromAll} disabled={bgAllProcessing} className="gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {bgAllProcessing ? `${bgAllProgress.current}/${bgAllProgress.total}` : "BG All"}
                    </Button>
                    <Button variant="outline" onClick={() => { setImages([]); setFiles([]); setFreestyleItems([]); setBgImage(null); setStickers([]); setTemplateStyle(null); setTextLabels([]); setEditingTextId(null); setShapes([]); setSelectedShapeId(null); }}>Start Over</Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
                  </div>
                  {bgAllProcessing && (
                    <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${bgAllProgress.total > 0 ? (bgAllProgress.current / bgAllProgress.total) * 100 : 0}%` }} />
                    </div>
                  )}
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
                        <button onClick={(e) => { e.stopPropagation(); removeBgFromImage(idx); }}
                          className="absolute top-5 left-0.5 bg-primary/90 text-primary-foreground rounded text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 leading-tight">
                          {processingBg[idx] ? "..." : "BG"}
                        </button>
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
                {selectedIdx !== null && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photo #{selectedIdx + 1} Radius: {freestyleItems[selectedIdx]?.radius ?? radius}px</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => {
                        const r = freestyleItems[selectedIdx]?.radius ?? radius;
                        setFreestyleItems((prev) => prev.map((item) => ({ ...item, radius: r })));
                      }}>Apply to All</Button>
                    </div>
                    <Slider value={[freestyleItems[selectedIdx]?.radius ?? radius]} onValueChange={([v]) => {
                      setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, radius: v } : item));
                    }} min={0} max={200} step={1} />
                  </div>
                )}
                {selectedIdx !== null && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photo #{selectedIdx + 1} Opacity: {freestyleItems[selectedIdx]?.opacity ?? 100}%</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => {
                        const o = freestyleItems[selectedIdx]?.opacity ?? 100;
                        setFreestyleItems((prev) => prev.map((item) => ({ ...item, opacity: o })));
                      }}>Apply to All</Button>
                    </div>
                    <Slider value={[freestyleItems[selectedIdx]?.opacity ?? 100]} onValueChange={([v]) => {
                      setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, opacity: v } : item));
                    }} min={0} max={100} step={1} />
                  </div>
                )}
                {selectedIdx !== null && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photo #{selectedIdx + 1} Border</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => {
                        const sel = freestyleItems[selectedIdx];
                        setFreestyleItems((prev) => prev.map((item) => ({ ...item, borderWidth: sel?.borderWidth ?? 0, borderColor: sel?.borderColor || "#ffffff" })));
                      }}>Apply to All</Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={freestyleItems[selectedIdx]?.borderWidth ?? 0}
                        onChange={(e) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, borderWidth: Math.max(0, +e.target.value) } : item))}
                        className="w-14 h-7 text-xs border rounded px-1 bg-transparent" min={0} max={20} />
                      <input type="color" value={freestyleItems[selectedIdx]?.borderColor || "#ffffff"}
                        onChange={(e) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, borderColor: e.target.value } : item))}
                        className="w-8 h-7 p-0.5 rounded border bg-transparent" />
                    </div>
                  </div>
                )}
                {selectedIdx !== null && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs">Adjustments</Label>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px]">Brightness: {freestyleItems[selectedIdx]?.brightness ?? 100}%</Label>
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => {
                          const v = freestyleItems[selectedIdx]?.brightness ?? 100;
                          setFreestyleItems((prev) => prev.map((item) => ({ ...item, brightness: v })));
                        }}>Apply to All</Button>
                      </div>
                      <Slider value={[freestyleItems[selectedIdx]?.brightness ?? 100]} onValueChange={([v]) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, brightness: v } : item))} min={0} max={200} step={1} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px]">Contrast: {freestyleItems[selectedIdx]?.contrast ?? 100}%</Label>
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => {
                          const v = freestyleItems[selectedIdx]?.contrast ?? 100;
                          setFreestyleItems((prev) => prev.map((item) => ({ ...item, contrast: v })));
                        }}>Apply to All</Button>
                      </div>
                      <Slider value={[freestyleItems[selectedIdx]?.contrast ?? 100]} onValueChange={([v]) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, contrast: v } : item))} min={0} max={200} step={1} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px]">Saturation: {freestyleItems[selectedIdx]?.saturation ?? 100}%</Label>
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => {
                          const v = freestyleItems[selectedIdx]?.saturation ?? 100;
                          setFreestyleItems((prev) => prev.map((item) => ({ ...item, saturation: v })));
                        }}>Apply to All</Button>
                      </div>
                      <Slider value={[freestyleItems[selectedIdx]?.saturation ?? 100]} onValueChange={([v]) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, saturation: v } : item))} min={0} max={200} step={1} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px]">Blend Mode</Label>
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => {
                          const v = freestyleItems[selectedIdx]?.blendMode;
                          setFreestyleItems((prev) => prev.map((item) => ({ ...item, blendMode: v })));
                        }}>Apply to All</Button>
                      </div>
                      <Select value={freestyleItems[selectedIdx]?.blendMode || "source-over"} onValueChange={(v) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, blendMode: v === "source-over" ? undefined : v as any } : item))}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="source-over">Normal</SelectItem>
                          <SelectItem value="multiply">Multiply</SelectItem>
                          <SelectItem value="screen">Screen</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="darken">Darken</SelectItem>
                          <SelectItem value="lighten">Lighten</SelectItem>
                          <SelectItem value="color-dodge">Color Dodge</SelectItem>
                          <SelectItem value="color-burn">Color Burn</SelectItem>
                          <SelectItem value="hard-light">Hard Light</SelectItem>
                          <SelectItem value="soft-light">Soft Light</SelectItem>
                          <SelectItem value="difference">Difference</SelectItem>
                          <SelectItem value="exclusion">Exclusion</SelectItem>
                          <SelectItem value="hue">Hue</SelectItem>
                          <SelectItem value="saturation">Saturation</SelectItem>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="luminosity">Luminosity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {selectedIdx !== null && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photo #{selectedIdx + 1} Shape</Label>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => {
                        const s = freestyleItems[selectedIdx]?.shape;
                        setFreestyleItems((prev) => prev.map((item) => ({ ...item, shape: s })));
                      }}>Apply to All</Button>
                    </div>
                    <div className="flex gap-1 flex-wrap max-h-36 overflow-y-auto">
                      {SHAPES.map((st) => {
                        const isActive = (freestyleItems[selectedIdx]?.shape ?? "") === st.value;
                        return (
                          <button key={st.value}
                            onClick={() => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, shape: st.value || undefined } : item))}
                            className={`w-7 h-7 flex items-center justify-center rounded text-[10px] border transition-colors shrink-0 ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:bg-accent"}`}
                            title={st.label}>
                            {st.icon}
                          </button>
                        );
                      })}
                    </div>
                    {freestyleItems[selectedIdx]?.shape && freestyleItems[selectedIdx]?.shape !== "rect" && (
                      <p className="text-[10px] text-muted-foreground">Photo is clipped to {freestyleItems[selectedIdx]?.shape} shape. Use Pan mode to move image inside.</p>
                    )}
                  </div>
                )}
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Shapes / Frames</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                  const id = Math.random().toString(36).slice(2);
                  const W = mode === "social" ? socialPreset.w : canvasW;
                  const H = mode === "social" ? socialPreset.h : canvasH;
                  setShapes((prev) => [...prev, { id, type: "circle" as const, x: 50, y: 50, w: 100, h: 100, fill: bgColor, stroke: "#000000", strokeWidth: 2, rotation: 0 }]);
                }} className="h-7 px-2 text-xs gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </CardHeader>
              <CardContent>
                {shapes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No shapes yet. Click "Add" to insert a shape.</p>
                ) : (
                  <div className="space-y-2">
                    {shapes.map((s, idx) => (
                      <div key={s.id} className={`border rounded-lg p-2 space-y-2 ${selectedShapeId === s.id ? "border-primary" : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">{s.type}</span>
                          <button onClick={() => { setShapes((prev) => prev.filter((_, i) => i !== idx)); if (selectedShapeId === s.id) setSelectedShapeId(null); }} className="text-destructive hover:text-destructive/80"><X className="h-3 w-3" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <Label className="text-[10px]">Type</Label>
                            <Select value={s.type} onValueChange={(v) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, type: v as any } : sh))}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent className="max-h-48">
                                {SHAPES.filter((s) => s.value).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Fill</Label>
                            <input type="color" value={s.fill} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, fill: e.target.value } : sh))}
                              className="w-full h-7 p-0.5 rounded border bg-transparent" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Stroke</Label>
                            <input type="color" value={s.stroke} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, stroke: e.target.value } : sh))}
                              className="w-full h-7 p-0.5 rounded border bg-transparent" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Width</Label>
                            <input type="number" value={s.strokeWidth} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, strokeWidth: Math.max(0, +e.target.value) } : sh))}
                              className="w-full h-7 text-xs border rounded px-1 bg-transparent" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <Label className="text-[10px]">W: {s.w}</Label>
                            <input type="range" value={s.w} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, w: +e.target.value } : sh))}
                              min={20} max={500} className="w-full h-4" />
                          </div>
                          <div>
                            <Label className="text-[10px]">H: {s.h}</Label>
                            <input type="range" value={s.h} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, h: +e.target.value } : sh))}
                              min={20} max={500} className="w-full h-4" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <Label className="text-[10px]">X: {s.x}</Label>
                            <input type="range" value={s.x} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, x: +e.target.value } : sh))}
                              min={0} max={800} className="w-full h-4" />
                          </div>
                          <div>
                            <Label className="text-[10px]">Y: {s.y}</Label>
                            <input type="range" value={s.y} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, y: +e.target.value } : sh))}
                              min={0} max={600} className="w-full h-4" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px]">Rotation: {s.rotation}°</Label>
                          <input type="range" value={s.rotation} onChange={(e) => setShapes((prev) => prev.map((sh, i) => i === idx ? { ...sh, rotation: +e.target.value } : sh))}
                            min={0} max={360} className="w-full h-4" />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => {
                      const id = Math.random().toString(36).slice(2);
                      setShapes((prev) => [...prev, { id, type: "circle" as const, x: 50, y: 50, w: 100, h: 100, fill: bgColor, stroke: "#000000", strokeWidth: 2, rotation: 0 }]);
                    }} className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg py-1.5">+ Add another shape</button>
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
                        {images.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-[10px]">Image Fill {tl.imageFillIdx !== undefined ? '(active)' : ''}</Label>
                            <div className="flex gap-1 flex-wrap">
                              <button onClick={() => updateText(tl.id, { imageFillIdx: undefined })}
                                className={`h-6 px-1.5 text-[9px] rounded border ${tl.imageFillIdx === undefined ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}>None</button>
                              {images.slice(0, 10).map((_, i) => (
                                <button key={i} onClick={() => updateText(tl.id, { imageFillIdx: i })}
                                  className={`h-6 w-6 rounded border text-[9px] ${tl.imageFillIdx === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border hover:bg-accent'}`}>{i + 1}</button>
                              ))}
                            </div>
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
