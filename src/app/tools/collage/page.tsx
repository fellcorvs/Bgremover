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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";

type LayoutMode = "grid" | "masonry" | "bento" | "split" | "freestyle" | "social";
type SplitDir = "vertical" | "horizontal" | "triple" | "four" | "multi";
type SocialPreset = { label: string; w: number; h: number };
type BentoPreset = "featured-left" | "featured-right" | "featured-top" | "featured-center";
type TemplateStyle = "minimalist" | "vintage" | "wedding" | "birthday" | "travel" | "fashion" | "scrapbook" | "magazine";

const FONTS = [
  "Abadi MT Condensed Light","Albertus Extra Bold","Albertus Medium","Antique Olive",
  "Arial","Arial Black","Arial MT","Arial Narrow","Bazooka","Book Antiqua","Bookman Old Style",
  "Boulder","Calisto MT","Calligrapher","Century Gothic","Century Schoolbook","Cezanne",
  "CG Omega","CG Times","Charlesworth","Chaucer","Clarendon Condensed","Comic Sans MS",
  "Copperplate Gothic Bold","Copperplate Gothic Light","Cornerstone","Coronet","Courier",
  "Courier New","Cuckoo","Dauphin","Denmark","Fransiscan","Garamond","Geneva",
  "Haettenschweiler","Heather","Helvetica","Herald","Impact","Jester","Letter Gothic",
  "Lithograph","Lithograph Light","Long Island","Lucida Console","Lucida Handwriting",
  "Lucida Sans","Lucida Sans Unicode","Marigold","Market","Matisse ITC","MS LineDraw",
  "News GothicMT","OCR A Extended","Old Century","Pegasus","Pickwick","Poster","Pythagoras",
  "Sceptre","Sherwood","Signboard","Socket","Steamer","Storybook","Subway","Tahoma",
  "Technical","Teletype","Tempus Sans ITC","Times","Times New Roman","Times New Roman PS",
  "Trebuchet MS","Tristan","Tubular","Unicorn","Univers","Univers Condensed","Vagabond",
  "Verdana","Westminster","Allegro","Amazone BT","AmerType Md BT","Arrus BT","Aurora Cn BT",
  "AvantGarde Bk BT","AvantGarde Md BT","BankGothic Md BT","Benguiat Bk BT",
  "BernhardFashion BT","BernhardMod BT","BinnerD","Bremen Bd BT","CaslonOpnface BT",
  "Charter Bd BT","Charter BT","ChelthmITC Bk BT","CloisterBlack BT","CopperplGoth Bd BT",
  "English 111 Vivace BT","EngraversGothic BT","Exotc350 Bd BT","Freefrm721 Blk BT",
  "FrnkGothITC Bk BT","Futura Bk BT","Futura Lt BT","Futura Md BT","Futura ZBlk BT",
  "FuturaBlack BT","Galliard BT","Geometr231 BT","Geometr231 Hv BT","Geometr231 Lt BT",
  "GeoSlab 703 Lt BT","GeoSlab 703 XBd BT","GoudyHandtooled BT","GoudyOLSt BT",
  "Humanst521 BT","Humanst 521 Cn BT","Humanst521 Lt BT","Incised901 Bd BT","Incised901 BT",
  "Incised901 Lt BT","Informal011 BT","Kabel Bk BT","Kabel Ult BT","Kaufmann Bd BT",
  "Kaufmann BT","Korinna BT","Lydian BT","Monotype Corsiva","NewsGoth BT","Onyx BT",
  "OzHandicraft BT","PosterBodoni BT","PTBarnum BT","Ribbon131 Bd BT","Serifa BT",
  "Serifa Th BT","ShelleyVolante BT","Souvenir Lt BT","Staccato222 BT","Swis721 BlkEx BT",
  "Swiss911 XCm BT","TypoUpright BT","ZapfEllipt BT","ZapfHumnst BT","ZapfHumnst Dm BT",
  "Zurich BlkEx BT","Zurich Ex BT","monospace","serif"
];

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
  padding?: number;
  bgColor?: string;
  bgPadding?: number;
  bgImage?: string;
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

function getTextBbox(ctx: CanvasRenderingContext2D, t: TextLabel): { x: number; y: number; w: number; h: number } {
  ctx.save();
  ctx.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
  const lines = t.text.split("\n");
  const lineH = t.fontSize * 1.2;
  const totalH = lines.length * lineH;
  const lineWidths = lines.map((l) => l.split("").reduce((w, ch) => w + ctx.measureText(ch).width + t.letterSpacing, -t.letterSpacing));
  const maxW = Math.max(...lineWidths, 0);
  const bp = t.bgPadding ?? 4;
  const metrics = ctx.measureText(lines[0] || " ");
  const ascent = metrics.actualBoundingBoxAscent || t.fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || t.fontSize * 0.2;
  ctx.restore();
  let minX: number, maxX: number;
  if (t.textAlign === "left") {
    minX = t.x; maxX = t.x + maxW;
  } else if (t.textAlign === "center") {
    minX = t.x - maxW; maxX = t.x;
  } else {
    minX = t.x - 2 * maxW; maxX = t.x - maxW;
  }
  const alignOffY = t.verticalAlign === "middle" ? -totalH / 2 : t.verticalAlign === "bottom" ? -totalH : 0;
  return {
    x: minX - bp,
    y: t.y + alignOffY - ascent - bp,
    w: maxX - minX + bp * 2,
    h: totalH + ascent + descent - lineH + bp * 2
  };
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
  const textBgFileRef = useRef<HTMLInputElement>(null);
  const textBgLabelRef = useRef<string | null>(null);
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
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const [fontSearch, setFontSearch] = useState("");
  const [inlineEdit, setInlineEdit] = useState<{ id: string; text: string; x: number; y: number; w: number; h: number } | null>(null);
  const inlineEditRef = useRef<HTMLTextAreaElement>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const undoRef = useRef(undoStack); undoRef.current = undoStack;
  const redoRef = useRef(redoStack); redoRef.current = redoStack;
  const skipClearRedoRef = useRef(false);
  const saveSnapshot = useCallback(() => {
    const snap = JSON.stringify({ images, freestyleItems, textLabels, shapes, bgType, bgColor, bgColor2, bgGradDir, bgImage, radius, padding, mode, cols, gap, canvasW, canvasH, opacity });
    setUndoStack((prev) => { const n = [...prev, snap]; if (n.length > 50) n.shift(); return n; });
    if (!skipClearRedoRef.current) setRedoStack([]);
    skipClearRedoRef.current = false;
  }, [images, freestyleItems, textLabels, shapes, bgType, bgColor, bgColor2, bgGradDir, bgImage, radius, padding, mode, cols, gap, canvasW, canvasH, opacity]);
  const undo = useCallback(() => {
    skipClearRedoRef.current = true;
    const stack = undoRef.current;
    if (stack.length < 2) return;
    const cur = stack[stack.length - 1];
    const prev = stack[stack.length - 2];
    setRedoStack((r) => [...r, cur]);
    setUndoStack((s) => s.slice(0, -1));
    const p = JSON.parse(prev);
    if (p.images !== undefined) setImages(p.images);
    if (p.freestyleItems) setFreestyleItems(p.freestyleItems);
    if (p.textLabels) setTextLabels(p.textLabels);
    if (p.shapes) setShapes(p.shapes);
    if (p.bgType) setBgType(p.bgType);
    setBgColor(p.bgColor ?? "#ffffff"); setBgColor2(p.bgColor2 ?? "#e0e0e0"); setBgGradDir(p.bgGradDir ?? "to right");
    if (p.bgImage !== undefined) setBgImage(p.bgImage);
    if (p.radius !== undefined) setRadius(p.radius);
    if (p.padding !== undefined) setPadding(p.padding);
    if (p.mode) setMode(p.mode);
    if (p.cols !== undefined) setCols(p.cols);
    if (p.gap !== undefined) setGap(p.gap);
    if (p.canvasW) setCanvasW(p.canvasW); if (p.canvasH) setCanvasH(p.canvasH);
    if (p.opacity !== undefined) setOpacity(p.opacity);
  }, []);
  const redo = useCallback(() => {
    skipClearRedoRef.current = true;
    const stack = redoRef.current;
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    setUndoStack((s) => [...s, next]);
    setRedoStack((r) => r.slice(0, -1));
    const p = JSON.parse(next);
    if (p.images !== undefined) setImages(p.images);
    if (p.freestyleItems) setFreestyleItems(p.freestyleItems);
    if (p.textLabels) setTextLabels(p.textLabels);
    if (p.shapes) setShapes(p.shapes);
    if (p.bgType) setBgType(p.bgType);
    setBgColor(p.bgColor ?? "#ffffff"); setBgColor2(p.bgColor2 ?? "#e0e0e0"); setBgGradDir(p.bgGradDir ?? "to right");
    if (p.bgImage !== undefined) setBgImage(p.bgImage);
    if (p.radius !== undefined) setRadius(p.radius);
    if (p.padding !== undefined) setPadding(p.padding);
    if (p.mode) setMode(p.mode);
    if (p.cols !== undefined) setCols(p.cols);
    if (p.gap !== undefined) setGap(p.gap);
    if (p.canvasW) setCanvasW(p.canvasW); if (p.canvasH) setCanvasH(p.canvasH);
    if (p.opacity !== undefined) setOpacity(p.opacity);
  }, []);
  const { toast } = useToast();
  const hoveredRef = useRef<number | null>(null);
  hoveredRef.current = hoveredIdx;
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selectedIdx;
  const [panMode, setPanMode] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropHandle, setCropHandle] = useState<number | null>(null);
  const cropRectRef = useRef({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const [photoPanIdx, setPhotoPanIdx] = useState<number | null>(null);
  const cachedImagesRef = useRef<HTMLImageElement[]>([]);
  const bgImageCacheRef = useRef<HTMLImageElement | null>(null);
  const textBgCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const isDraggingRef = useRef(false);
  const isExportingRef = useRef(false);
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
      padding: 0,
      bgPadding: 0,
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
      const bImg = await new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => { bgImageCacheRef.current = i; res(i); }; i.src = bgImage!; });
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
        const so = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const oX = (item.offsetX || 0) * so; const oY = (item.offsetY || 0) * so;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { ctx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        const tmpC = document.createElement('canvas'); tmpC.width = item.w; tmpC.height = item.h;
        const tmpX = tmpC.getContext('2d')!;
        if (bri !== 1 || con !== 1 || sat !== 1) { tmpX.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { tmpX.globalCompositeOperation = item.blendMode; }
        tmpX.drawImage(img, -img.width * so / 2 + oX + item.w / 2, -img.height * so / 2 + oY + item.h / 2, img.width * so, img.height * so);
        tmpX.filter = 'none';
        tmpX.globalCompositeOperation = 'destination-in';
        tmpX.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
        tmpX.textAlign = 'center'; tmpX.textBaseline = 'middle'; tmpX.fillStyle = '#fff';
        tmpX.fillText(ch, item.w / 2, item.h / 2);
        tmpX.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmpC, -item.w / 2, -item.h / 2);
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
      if (t.id === editingTextId) continue;
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
      const tPad = t.padding || 0;
      if (tPad > 0) {
        ctx.save();
        ctx.fillStyle = t.bgColor!;
        ctx.beginPath(); ctx.roundRect(-tPad, -tPad, lw + tPad * 2, th + tPad * 2, 4); ctx.fill();
        ctx.restore();
      }
      if (t.bgImage || t.bgColor) {
        const th = lines.length * lineH;
        const lw = Math.max(...lineWidths, 0);
        const bp = t.bgPadding ?? 4;
        if (t.bgImage) {
          const bgI = textBgCacheRef.current[t.id];
          if (bgI) ctx.drawImage(bgI, -bp, -bp, lw + bp * 2, th + bp * 2);
          else { const i = new Image(); i.onload = () => { textBgCacheRef.current[t.id] = i; setRenderTrigger((k) => k + 1); }; i.src = t.bgImage; }
        } else {
          ctx.fillStyle = t.bgColor!;
          ctx.beginPath(); ctx.roundRect(-bp, -bp, lw + bp * 2, th + bp * 2, 4); ctx.fill();
        }
      }
      for (let li = 0; li < lines.length; li++) {
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
    if (!canvas || isExportingRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || freestyleItems.length === 0) return;
    const sel = selectedRef.current;
    for (let idx = 0; idx < freestyleItems.length; idx++) {
      if (idx !== sel) continue;
      const item = freestyleItems[idx];
      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(item.flipH ? -1 : 1, item.flipV ? -1 : 1);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-item.w / 2, -item.h / 2, item.w, item.h);
      ctx.setLineDash([]);
      const hs = 7;
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
    if (sel !== null) {
      const item = freestyleItems[sel];
      if (item) {
        const xb = item.x + item.w;
        const yb = item.y;
        ctx.save();
        ctx.translate(xb, yb);
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, 6);
        ctx.moveTo(6, -6);
        ctx.lineTo(-6, 6);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (editingTextId) {
      const tl = textLabels.find(t => t.id === editingTextId);
      if (tl) {
        ctx.save();
        ctx.font = `${tl.italic ? "italic " : ""}${tl.bold ? "bold " : ""}${tl.fontSize}px ${tl.fontFamily}`;
        const bb = getTextBbox(ctx, tl);
        const isDragging = textDragIdx !== null;
        ctx.strokeStyle = isDragging ? "#f59e0b" : "#3b82f6";
        ctx.lineWidth = isDragging ? 2.5 : 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(bb.x, bb.y, bb.w, bb.h);
        ctx.setLineDash([]);
        const xB = bb.x + bb.w;
        const yB = bb.y;
        ctx.beginPath();
        ctx.arc(xB, yB, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xB - 5, yB - 5);
        ctx.lineTo(xB + 5, yB + 5);
        ctx.moveTo(xB + 5, yB - 5);
        ctx.lineTo(xB - 5, yB + 5);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (cropMode && sel !== null) {
      const item = freestyleItems[sel];
      if (item) {
        const cr = cropRectRef.current;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, canvas.width, cr.y1);
        ctx.fillRect(0, cr.y2, canvas.width, canvas.height - cr.y2);
        ctx.fillRect(0, cr.y1, cr.x1, cr.y2 - cr.y1);
        ctx.fillRect(cr.x2, cr.y1, canvas.width - cr.x2, cr.y2 - cr.y1);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(cr.x1, cr.y1, cr.x2 - cr.x1, cr.y2 - cr.y1);
        const hs = 10;
        const handles: [number, number][] = [[cr.x1, cr.y1], [cr.x2, cr.y1], [cr.x1, cr.y2], [cr.x2, cr.y2],
          [(cr.x1 + cr.x2) / 2, cr.y1], [(cr.x1 + cr.x2) / 2, cr.y2], [cr.x1, (cr.y1 + cr.y2) / 2], [cr.x2, (cr.y1 + cr.y2) / 2]];
        for (const [hx, hy] of handles) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
        }
        ctx.restore();
      }
    }
  }, [freestyleItems, textLabels, editingTextId, selectedIdx, cropMode, textDragIdx]);

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
      const cachedBg = bgImageCacheRef.current;
      if (cachedBg && cachedBg.src === bgImage) {
        ctx.drawImage(cachedBg, 0, 0, W, H);
      } else if (!bgImage.startsWith('blob:') && !bgImage.startsWith('data:')) {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);
      }
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
        const so = Math.max(item.w / img.width, item.h / img.height) * (item.imgScale || 1);
        const oX = (item.offsetX || 0) * so; const oY = (item.offsetY || 0) * so;
        const bri = (item.brightness ?? 100) / 100; const con = (item.contrast ?? 100) / 100; const sat = (item.saturation ?? 100) / 100;
        if (bri !== 1 || con !== 1 || sat !== 1) { ctx.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { ctx.globalCompositeOperation = item.blendMode; }
        const tmpC = document.createElement('canvas'); tmpC.width = item.w; tmpC.height = item.h;
        const tmpX = tmpC.getContext('2d')!;
        if (bri !== 1 || con !== 1 || sat !== 1) { tmpX.filter = `brightness(${bri}) contrast(${con}) saturate(${sat})`; }
        if (item.blendMode && item.blendMode !== 'source-over') { tmpX.globalCompositeOperation = item.blendMode; }
        tmpX.drawImage(img, -img.width * so / 2 + oX + item.w / 2, -img.height * so / 2 + oY + item.h / 2, img.width * so, img.height * so);
        tmpX.filter = 'none';
        tmpX.globalCompositeOperation = 'destination-in';
        tmpX.font = `bold ${Math.min(item.w, item.h) * 0.85}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",Arial,sans-serif`;
        tmpX.textAlign = 'center'; tmpX.textBaseline = 'middle'; tmpX.fillStyle = '#fff';
        tmpX.fillText(ch, item.w / 2, item.h / 2);
        tmpX.globalCompositeOperation = 'source-over';
        ctx.drawImage(tmpC, -item.w / 2, -item.h / 2);
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
      if (t.id === editingTextId) continue;
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
      const tPad = t.padding || 0;
      if (tPad > 0) {
        const th = lines.length * lineH;
        const lw = Math.max(...lineWidths, 0);
        ctx.beginPath(); ctx.roundRect(-tPad, -tPad, lw + tPad * 2, th + tPad * 2, 4); ctx.clip();
      }
      if (t.bgImage || t.bgColor) {
        const th = lines.length * lineH;
        const lw = Math.max(...lineWidths, 0);
        const bp = t.bgPadding ?? 4;
        if (t.bgImage) {
          const bgI = textBgCacheRef.current[t.id];
          if (bgI) ctx.drawImage(bgI, -bp, -bp, lw + bp * 2, th + bp * 2);
          else { const i = new Image(); i.onload = () => { textBgCacheRef.current[t.id] = i; setRenderTrigger((k) => k + 1); }; i.src = t.bgImage; }
        } else {
          ctx.fillStyle = t.bgColor!;
          ctx.beginPath(); ctx.roundRect(-bp, -bp, lw + bp * 2, th + bp * 2, 4); ctx.fill();
        }
      }
      for (let li = 0; li < lines.length; li++) {
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
  }, [mode, canvasW, canvasH, bgType, bgColor, bgColor2, bgGradDir, bgImage, padding, radius, freestyleItems, textLabels, shapes, editingTextId, drawOverlay]);

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
  }, [renderToCanvas, images.length, quickRender, drawOverlay, mode, gap, padding, cols, masonryCols, bentoPreset, splitDir, splitRatio, canvasW, canvasH, socialPreset, renderTrigger, editingTextId]);

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
    if (!freestyleDragging && !freestyleResizing && textDragIdx === null && photoDragIdx === null && photoResizeIdx === null && photoRotateIdx === null && photoPanIdx === null && cropHandle === null) {
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
          const s = items[photoPanIdx].imgScale || 1;
          const origOX = (dragStart.current.item as any).ox ?? 0;
          const origOY = (dragStart.current.item as any).oy ?? 0;
          const origMX = dragStart.current.x;
          const origMY = dragStart.current.y;
          setFreestyleItems((prev) => prev.map((iv, i) => i === photoPanIdx ? { ...iv, offsetX: origOX + (mx - origMX) / s, offsetY: origOY + (my - origMY) / s } : iv));
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
      } else if (cropHandle !== null && selectedIdx !== null) {
        const cvs = canvasRef.current;
        if (cvs) {
          const rectC = cvs.getBoundingClientRect();
          const scC = cvs.width / rectC.width;
          const cr = dragStart.current.item;
          const mdx = (e.clientX - dragStart.current.x) * scC;
          const mdy = (e.clientY - dragStart.current.y) * scC;
          const minR = 20;
          let nx1 = cr.x, ny1 = cr.y, nx2 = cr.w, ny2 = cr.h;
          const handleIdx = cropHandle;
          if (handleIdx === 0) { nx1 = Math.min(cr.x + mdx, cr.w - minR); ny1 = Math.min(cr.y + mdy, cr.h - minR); }
          else if (handleIdx === 1) { nx2 = Math.max(cr.w + mdx, cr.x + minR); ny1 = Math.min(cr.y + mdy, cr.h - minR); }
          else if (handleIdx === 2) { nx1 = Math.min(cr.x + mdx, cr.w - minR); ny2 = Math.max(cr.h + mdy, cr.y + minR); }
          else if (handleIdx === 3) { nx2 = Math.max(cr.w + mdx, cr.x + minR); ny2 = Math.max(cr.h + mdy, cr.y + minR); }
          else if (handleIdx === 4) { ny1 = Math.min(cr.y + mdy, cr.h - minR); }
          else if (handleIdx === 5) { ny2 = Math.max(cr.h + mdy, cr.y + minR); }
          else if (handleIdx === 6) { nx1 = Math.min(cr.x + mdx, cr.w - minR); }
          else if (handleIdx === 7) { nx2 = Math.max(cr.w + mdx, cr.x + minR); }
          cropRectRef.current = { x1: nx1, y1: ny1, x2: nx2, y2: ny2 };
          requestAnimationFrame(() => drawOverlay());
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
      setFreestyleDragging(false); setFreestyleResizing(false); setTextDragIdx(null); setPhotoDragIdx(null); setPhotoResizeIdx(null); setPhotoRotateIdx(null); setPhotoPanIdx(null); setCropHandle(null);
      resizeDirRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [freestyleDragging, freestyleResizing, selectedIdx, textDragIdx, photoDragIdx, photoResizeIdx, photoRotateIdx, photoPanIdx, cropHandle, quickRender, renderToCanvas, drawOverlay, mode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        const id = editingTextId;
        if (id) { removeText(id); return; }
        if (selectedIdx !== null) { removeImage(selectedIdx); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo, editingTextId, selectedIdx]);

  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => saveSnapshot(), 800);
    return () => { if (snapTimerRef.current) clearTimeout(snapTimerRef.current); };
  }, [images, freestyleItems, textLabels, shapes]);

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
            {images.length === 0 && (
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
                  </CardContent>
              </Card>
            )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} className="hidden" />
            {images.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="overflow-auto w-full" style={{ maxHeight: 600 }}>
                    <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', position: 'relative' }}>
                  <canvas ref={canvasRef} className="rounded-lg border" style={{ cursor: "default" }}
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
                    onDoubleClick={(e) => {
                      const rectC = canvasRef.current?.getBoundingClientRect();
                      if (!rectC) return;
                      const scaleX = canvasRef.current!.width / rectC.width;
                      const scaleY = canvasRef.current!.height / rectC.height;
                      const mx = (e.clientX - rectC.left) * scaleX;
                      const my = (e.clientY - rectC.top) * scaleY;
                      const ctx2 = canvasRef.current?.getContext('2d');
                      if (ctx2) {
                        for (let i = 0; i < textLabels.length; i++) {
                          const t = textLabels[i];
                          ctx2.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
                          const bb = getTextBbox(ctx2, t);
                          if (mx >= bb.x && mx <= bb.x + bb.w && my >= bb.y && my <= bb.y + bb.h) {
                            setEditingTextId(t.id);
                            setTextDragIdx(null);
                            setInlineEdit({ id: t.id, text: t.text, x: bb.x, y: bb.y, w: bb.w, h: bb.h });
                            return;
                          }
                        }
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
                      if (selectedIdx !== null) {
                        const si = freestyleItems[selectedIdx];
                        if (si) {
                          const xb = si.x + si.w, yb = si.y;
                          if (Math.hypot(mx - xb, my - yb) < 18) { removeImage(selectedIdx); return; }
                        }
                      }
                      const ctx2 = canvasRef.current?.getContext('2d');
                      let textXHit = -1;
                      if (ctx2) {
                        for (let i = 0; i < textLabels.length; i++) {
                          const t = textLabels[i];
                          ctx2.font = `${t.italic ? "italic " : ""}${t.bold ? "bold " : ""}${t.fontSize}px ${t.fontFamily}`;
                          const bb = getTextBbox(ctx2, t);
                          if (mx >= bb.x && mx <= bb.x + bb.w && my >= bb.y && my <= bb.y + bb.h) {
                            textXHit = i;
                            const xB = bb.x + bb.w, yB = bb.y;
                            if (Math.hypot(mx - xB, my - yB) < 15) { removeText(t.id); return; }
                            break;
                          }
                        }
                      }
                      if (textXHit >= 0) {
                        setEditingTextId(textLabels[textXHit].id);
                        setTextDragIdx(textXHit);
                        dragStart.current = { x: e.clientX, y: e.clientY, item: { x: textLabels[textXHit].x, y: textLabels[textXHit].y, w: 0, h: 0 } };
                        return;
                      }
                      for (let pi2 = 0; pi2 < freestyleItems.length; pi2++) {
                        const it = freestyleItems[pi2];
                        const xb2 = it.x + it.w, yb2 = it.y;
                        if (Math.hypot(mx - xb2, my - yb2) < 18) { removeImage(pi2); return; }
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
                          if (cropMode && pi === selectedIdx) {
                            const cr = cropRectRef.current;
                            const hs = 10;
                            const chs: [number, number][] = [[cr.x1, cr.y1], [cr.x2, cr.y1], [cr.x1, cr.y2], [cr.x2, cr.y2],
                              [(cr.x1 + cr.x2) / 2, cr.y1], [(cr.x1 + cr.x2) / 2, cr.y2], [cr.x1, (cr.y1 + cr.y2) / 2], [cr.x2, (cr.y1 + cr.y2) / 2]];
                            let hitCh = -1;
                            for (let hi = 0; hi < chs.length; hi++) {
                              if (Math.abs(mx - chs[hi][0]) < hs + 4 && Math.abs(my - chs[hi][1]) < hs + 4) { hitCh = hi; break; }
                            }
                            if (hitCh >= 0) {
                              setCropHandle(hitCh);
                              dragStart.current = { x: e.clientX, y: e.clientY, item: { x: cr.x1, y: cr.y1, w: cr.x2, h: cr.y2 } };
                              redraw();
                              return;
                            }
                          }
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
                           dragStart.current = { x: mx, y: my, item: { x: found.x, y: found.y, w: found.w, h: found.h, ox: found.offsetX || 0, oy: found.offsetY || 0 } as any };
                        } else {
                          setPhotoDragIdx(pi);
                        }
                        if (!panMode) dragStart.current = { x: e.clientX, y: e.clientY, item: { x: found.x, y: found.y, w: found.w, h: found.h } };
                        redraw();
                      }
                      if (rotateHit < 0 && pi < 0 && textXHit < 0) {
                        setSelectedIdx(null);
                        setEditingTextId(null);
                        setInlineEdit(null);
                        requestAnimationFrame(() => drawOverlay());
                      }
                  }}
                  />
                    {inlineEdit && (() => {
                      const cvs = canvasRef.current;
                      if (!cvs) return null;
                      const r = cvs.getBoundingClientRect();
                      const sx = r.width / cvs.width;
                      const sy = r.height / cvs.height;
                      return (
                        <textarea
                          ref={inlineEditRef}
                          value={inlineEdit.text}
                          onChange={(e) => setInlineEdit({ ...inlineEdit, text: e.target.value })}
                          onBlur={() => {
                            updateText(inlineEdit.id, { text: inlineEdit.text });
                            setInlineEdit(null);
                            setRenderTrigger((k) => k + 1);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Escape") { setInlineEdit(null); }
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              (e.target as HTMLTextAreaElement).blur();
                            }
                          }}
                          className="absolute rounded border-2 border-blue-500 bg-transparent text-sm p-1 resize-none outline-none"
                          style={{
                            left: inlineEdit.x * sx,
                            top: inlineEdit.y * sy,
                            width: Math.max(inlineEdit.w * sx, 40),
                            height: Math.max(inlineEdit.h * sy, 20),
                            fontFamily: textLabels.find(t => t.id === inlineEdit.id)?.fontFamily || 'sans-serif',
                            fontSize: (textLabels.find(t => t.id === inlineEdit.id)?.fontSize || 16) * sy,
                          }}
                          autoFocus
                        />
                      );
                    })()}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <Select onValueChange={(fmt) => {
                      isExportingRef.current = true;
                      renderToCanvas().then(() => {
                        const canvas = canvasRef.current;
                        if (!canvas) { isExportingRef.current = false; return; }
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
                        isExportingRef.current = false;
                      });
                    }}>
                      <SelectTrigger type="button" className="h-9 w-28 text-xs gap-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0"><Download className="h-4 w-4" /> Download</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="word">WORD</SelectItem>
                        <SelectItem value="svg">SVG</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" onClick={triggerUpload}><Plus className="h-4 w-4" /> Add Photos</Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant={editingTextId ? "default" : "outline"} size="sm" className={editingTextId ? "bg-primary text-primary-foreground" : ""}>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 6.1H3M21 12.1H3M17 18H3"/><path d="m21 18-2.5-5L16 18"/></svg> Text
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[280px] p-3">
                        <div className="space-y-3">
                          <Button size="sm" className="w-full" onClick={() => { addText(); }}>+ Add New Text</Button>
                          {editingTextId && (() => {
                            const tl = textLabels.find(t => t.id === editingTextId);
                            if (!tl) return null;
                            return (
                              <div className="space-y-2 border-t pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-[10px]">Size</Label>
                                    <Input type="number" value={tl.fontSize} onChange={(e) => updateText(tl.id, { fontSize: Math.max(8, +e.target.value) })} className="h-7 text-xs" />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Spacing</Label>
                                    <Input type="number" value={tl.letterSpacing} onChange={(e) => updateText(tl.id, { letterSpacing: +e.target.value })} className="h-7 text-xs" />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px]">Font</Label>
                                  <div className="flex gap-1">
                                    <Select value={tl.fontFamily} onValueChange={(v) => {
                                      setFontSearch("");
                                      updateText(tl.id, { fontFamily: v });
                                    }}>
                                      <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent className="max-h-64">
                                        <div className="sticky top-0 z-10 bg-popover px-1 pb-1"
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onKeyDown={(e) => e.stopPropagation()}>
                                          <Input
                                            placeholder="Search fonts..."
                                            value={fontSearch}
                                            onChange={(e) => setFontSearch(e.target.value)}
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                        {[...FONTS, ...customFonts].filter((fn) =>
                                          fn.toLowerCase().includes(fontSearch.toLowerCase())
                                        ).map((fn) => (
                                          <SelectItem key={fn} value={fn}>{fn}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => fontFileRef.current?.click()} title="Upload custom font">+Font</Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => updateText(tl.id, { bold: !tl.bold })}
                                      className={`h-7 w-7 flex items-center justify-center rounded border text-xs font-bold ${tl.bold ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>B</button>
                                    <button onClick={() => updateText(tl.id, { italic: !tl.italic })}
                                      className={`h-7 w-7 flex items-center justify-center rounded border text-xs italic font-serif ${tl.italic ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>I</button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Label className="text-[10px]">Color</Label>
                                    <Input type="color" value={tl.color} onChange={(e) => updateText(tl.id, { color: e.target.value })} className="w-8 h-7 p-0.5 rounded border bg-transparent" />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-[10px]">Text Shadow</Label>
                                  <div className="flex gap-1 mt-1">
                                    {(["none", "shadow", "outline", "glow"] as const).map((e) => (
                                      <button key={e} onClick={() => updateText(tl.id, { effect: e })}
                                        className={`flex-1 h-6 text-[10px] rounded border capitalize ${tl.effect === e ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>{e === "none" ? "None" : e}</button>
                                    ))}
                                  </div>
                                  {tl.effect !== "none" && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Label className="text-[10px]">Color</Label>
                                      <Input type="color" value={tl.effectColor} onChange={(e) => updateText(tl.id, { effectColor: e.target.value })} className="w-8 h-7 p-0.5 rounded border bg-transparent" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px]">Rotation: {tl.rotation}°</Label>
                                  <Slider value={[tl.rotation]} onValueChange={([v]) => updateText(tl.id, { rotation: v })} min={-180} max={180} step={1} />
                                </div>
                                <div>
                                  <Label className="text-[10px]">Position</Label>
                                  <div className="grid grid-cols-3 gap-1 mt-1">
                                    <button onClick={() => updateText(tl.id, { textAlign: "left" })}
                                      className={`h-6 text-[10px] rounded border ${tl.textAlign === "left" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Left</button>
                                    <button onClick={() => updateText(tl.id, { textAlign: "center" })}
                                      className={`h-6 text-[10px] rounded border ${tl.textAlign === "center" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Center</button>
                                    <button onClick={() => updateText(tl.id, { textAlign: "right" })}
                                      className={`h-6 text-[10px] rounded border ${tl.textAlign === "right" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Right</button>
                                    <button onClick={() => updateText(tl.id, { verticalAlign: "top" })}
                                      className={`h-6 text-[10px] rounded border ${tl.verticalAlign === "top" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Top</button>
                                    <button onClick={() => updateText(tl.id, { verticalAlign: "middle" })}
                                      className={`h-6 text-[10px] rounded border ${tl.verticalAlign === "middle" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Middle</button>
                                    <button onClick={() => updateText(tl.id, { verticalAlign: "bottom" })}
                                      className={`h-6 text-[10px] rounded border ${tl.verticalAlign === "bottom" ? "bg-primary text-primary-foreground" : "bg-transparent"}`}>Bottom</button>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-[10px]">BG Color</Label>
                                    <Input type="color" value={tl.bgColor || '#000000'} onChange={(e) => updateText(tl.id, { bgColor: e.target.value })}
                                      className="w-8 h-7 p-0.5 rounded border bg-transparent" />
                                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { updateText(tl.id, { bgColor: undefined, bgImage: undefined }); if (textBgCacheRef.current[tl.id]) delete textBgCacheRef.current[tl.id]; }}>Clear</Button>
                                  </div>
                                </div>
                                <div>
                                  <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => { textBgLabelRef.current = tl.id; textBgFileRef.current?.click(); }}>
                                    {tl.bgImage ? "Change BG Image" : "Upload BG Image"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Select value={bgType} onValueChange={(v) => setBgType(v as any)}>
                      <SelectTrigger className="h-9 w-28 text-xs gap-1.5">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        Wallpaper
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid Color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                    {bgType === "solid" && (
                      <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 p-0.5 rounded border bg-transparent" />
                    )}
                    {bgType === "gradient" && (
                      <>
                        <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 p-0.5 rounded border bg-transparent" />
                        <Input type="color" value={bgColor2} onChange={(e) => setBgColor2(e.target.value)} className="w-8 h-8 p-0.5 rounded border bg-transparent" />
                      </>
                    )}
                    {bgType === "image" && (
                      <Button variant="outline" size="sm" onClick={() => bgFileRef.current?.click()}>
                        {bgImage ? "Change" : "Choose"}
                      </Button>
                    )}
                    <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { bgImageCacheRef.current = null; setBgImage(r.result as string); setBgType("image"); setRenderTrigger((k) => k + 1); }; r.readAsDataURL(f); }
                      e.target.value = '';
                    }} />
                    <input ref={textBgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f && textBgLabelRef.current) {
                        const id = textBgLabelRef.current;
                        const r = new FileReader(); r.onload = () => { updateText(id, { bgImage: r.result as string }); textBgCacheRef.current[id] = new Image(); textBgCacheRef.current[id].src = r.result as string; setRenderTrigger((k) => k + 1); }; r.readAsDataURL(f);
                      }
                      e.target.value = '';
                    }} />
                    <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2,.eot" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const fontName = f.name.replace(/\.[^.]+$/, "");
                        const r = new FileReader();
                        r.onload = () => {
                          const dataUrl = r.result as string;
                          const face = new FontFace(fontName, `url(${dataUrl})`);
                          face.load().then(() => {
                            document.fonts.add(face);
                            setCustomFonts((prev) => prev.includes(fontName) ? prev : [...prev, fontName]);
                            setRenderTrigger((k) => k + 1);
                          }).catch(() => {});
                        };
                        r.readAsDataURL(f);
                      }
                      e.target.value = '';
                    }} />
                    {selectedIdx !== null && (
                      <Button type="button" variant="default" size="sm" onClick={() => removeBgFromImage(selectedIdx)} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {processingBg[selectedIdx] ? "..." : "Remove BG"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={removeBgFromAll} disabled={bgAllProcessing} className="gap-1">
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {bgAllProcessing ? `${bgAllProgress.current}/${bgAllProgress.total}` : "BG All"}
                    </Button>
                    {selectedIdx !== null && (
                      <>
                        <Button type="button" variant={panMode ? "default" : "outline"} size="sm" onClick={() => setPanMode(!panMode)}
                          className={panMode ? "bg-primary text-primary-foreground" : ""}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/><path d="m8 8 4-4 4 4M8 16l4 4 4-4"/></svg>
                          {panMode ? "Pan" : "Move"}
                        </Button>
                        <Button type="button" variant={cropMode ? "default" : "outline"} size="sm" onClick={() => {
                          if (cropMode) {
                            setCropMode(false);
                          } else {
                            const it = freestyleItems[selectedIdx];
                            if (it) {
                              const margin = 10;
                              cropRectRef.current = { x1: it.x + margin, y1: it.y + margin, x2: it.x + it.w - margin, y2: it.y + it.h - margin };
                              setCropMode(true);
                            }
                          }
                        }}
                          className={cropMode ? "bg-primary text-primary-foreground" : ""}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
                          {cropMode ? "Crop On" : "Crop"}
                        </Button>
                        {cropMode && (
                          <Button type="button" variant="default" size="sm" onClick={() => {
                            const it = freestyleItems[selectedIdx];
                            if (!it) return;
                            const cr = cropRectRef.current;
                            const cw = cr.x2 - cr.x1, ch = cr.y2 - cr.y1;
                            if (cw < 10 || ch < 10) return;
                            const img = cachedImagesRef.current[selectedIdx];
                            if (!img) return;
                            const baseScale = Math.max(it.w / img.width, it.h / img.height);
                            const sc = baseScale * (it.imgScale || 1);
                            const cropCX = (cr.x1 + cr.x2) / 2 - (it.x + it.w / 2);
                            const cropCY = (cr.y1 + cr.y2) / 2 - (it.y + it.h / 2);
                            const newImgScale = (it.imgScale || 1) * Math.max(it.w / cw, it.h / ch);
                            const newOffsetX = -cropCX / sc + (it.offsetX || 0);
                            const newOffsetY = -cropCY / sc + (it.offsetY || 0);
                            setFreestyleItems((prev) => prev.map((iv, i) => i === selectedIdx ? { ...iv, imgScale: newImgScale, offsetX: newOffsetX, offsetY: newOffsetY } : iv));
                            setCropMode(false);
                            setRenderTrigger((k) => k + 1);
                          }} className="bg-green-600 hover:bg-green-700 text-white">Apply Crop</Button>
                        )}
                      </>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={undo} disabled={undoStack.length < 2}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h13a4 4 0 0 1 0 8H7"/><path d="M7 6l-4 4 4 4"/></svg></Button>
                    <Button type="button" variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H8a4 4 0 0 0 0 8h9"/><path d="M17 6l4 4-4 4"/></svg></Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setImages([]); setFiles([]); setFreestyleItems([]); setBgImage(null); setStickers([]); setTemplateStyle(null); setTextLabels([]); setEditingTextId(null); setShapes([]); setSelectedShapeId(null); }}>Start Over</Button>
                    <Select value={selectedIdx !== null ? (freestyleItems[selectedIdx]?.shape ?? "") : ""} onValueChange={(v) => { if (selectedIdx !== null) setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, shape: v || undefined } : item)); }}>
                      <SelectTrigger className="h-9 w-24 text-xs">
                        <span>Shape</span>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {SHAPES.filter((st) => st.value).map((st) => (
                          <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={templateStyle ?? ""} onValueChange={(v) => { if (v) applyTemplate(v as TemplateStyle); }}>
                      <SelectTrigger className="h-9 w-24 text-xs">
                        <span>Template</span>
                      </SelectTrigger>
                      <SelectContent className="max-h-60" style={{ overflowY: 'auto', scrollbarWidth: 'thin' }}>
                        {templates.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5 border-l pl-2 ml-1">
                      <span className="text-[10px] text-muted-foreground">Zoom</span>
                      <button onClick={() => setZoom(Math.max(25, zoom - 10))} className="w-6 h-6 flex items-center justify-center rounded border text-xs hover:bg-accent">−</button>
                      <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={25} max={200} step={5} className="w-16" />
                      <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="w-6 h-6 flex items-center justify-center rounded border text-xs hover:bg-accent">+</button>
                      <span className="text-[10px] w-7">{zoom}%</span>
                    </div>
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
                      <div className="flex-1">
                        <Slider value={[freestyleItems[selectedIdx]?.borderWidth ?? 0]}
                          onValueChange={([v]) => setFreestyleItems((prev) => prev.map((item, i) => i === selectedIdx ? { ...item, borderWidth: v } : item))}
                          min={0} max={20} step={1} />
                      </div>
                      <span className="text-[10px] w-6 text-right">{freestyleItems[selectedIdx]?.borderWidth ?? 0}px</span>
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
                <div className="space-y-1">
                  <Label className="text-xs">Padding: {padding}px</Label>
                  <Slider value={[padding]} onValueChange={([v]) => setPadding(v)} min={0} max={100} step={1} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
