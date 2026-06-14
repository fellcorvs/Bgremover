"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PRESET_COLORS = [
  "#ffffff", "#f5f5f5", "#e0e0e0", "#9e9e9e", "#616161", "#424242", "#212121", "#000000",
  "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
  "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
  "#795548", "#607d8b", "#1976d2", "#388e3c", "#f57c00", "#d32f2f", "#7b1fa2", "#c2185b",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className = "" }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLCanvasElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(0);
  const [light, setLight] = useState(100);
  const dragging = useRef<"wheel" | "slider" | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const hexToHsl = useCallback((hex: string) => {
    let r = 0, g = 0, b = 0;
    const h = hex.replace("#", "");
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length >= 6) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hh = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: hh = ((b - r) / d + 2) / 6; break;
        case b: hh = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(hh * 360), Math.round(s * 100), Math.round(l * 100)];
  }, []);

  useEffect(() => {
    if (open && value) {
      const [h, s, l] = hexToHsl(value);
      setHue(h);
      setSat(s);
      setLight(l);
    }
  }, [open, value, hexToHsl]);

  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 4;
    const imgData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;
        const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
        const hueDeg = angle * 360;
        const satPct = (dist / r) * 100;
        const [rr, gg, bb] = hslToRgb(hueDeg, satPct, 50);
        const idx = (y * w + x) * 4;
        imgData.data[idx] = rr;
        imgData.data[idx + 1] = gg;
        imgData.data[idx + 2] = bb;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const drawSlider = useCallback(() => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, hslToHex(hue, sat, 100));
    grad.addColorStop(0.5, hslToHex(hue, sat, 50));
    grad.addColorStop(1, hslToHex(hue, sat, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const ly = (1 - light / 100) * h;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, ly - 4, w - 2, 8);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, ly - 3, w, 6);
  }, [hue, sat, light, hslToHex]);

  useEffect(() => { if (open) drawWheel(); }, [open, drawWheel]);
  useEffect(() => { if (open) drawSlider(); }, [open, drawSlider, hue, sat]);

  const handleWheelDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    dragging.current = "wheel";
    updateWheel(e);
  };

  const handleSliderDown = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    dragging.current = "slider";
    updateSlider(e);
  };

  const updateWheel = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const r = Math.min(cx, cy) - 4;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r) return;
    const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
    setHue(Math.round(angle * 360));
    setSat(Math.round((dist / r) * 100));
  };

  const updateSlider = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sliderRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    const l = Math.max(0, Math.min(100, Math.round((1 - y / rect.height) * 100)));
    setLight(l);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      if (dragging.current === "wheel") updateWheel(e as any);
      else updateSlider(e as any);
    };
    const handleUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleEyedrop = async () => {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      onChange(result.sRGBHex);
      setOpen(false);
    } catch { }
  };

  const hasEyedropper = typeof window !== "undefined" && "EyeDropper" in window;

  // Desktop: render native input
  if (!isMobile) {
    return (
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-8 h-7 p-0.5 rounded border bg-transparent cursor-pointer ${className}`}
      />
    );
  }

  // Mobile: render custom color wheel picker
  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        className={`h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5 ${className}`}
        style={{ backgroundColor: value, borderColor: value === "#ffffff" ? "#ccc" : value }}
        onClick={() => setOpen(!open)}
        title="Pick a color"
      />
      {open && (
        <div className="absolute right-0 z-50 mt-1 rounded-lg border bg-popover p-3 shadow-xl" style={{ width: 220 }}>
          <canvas
            ref={wheelRef}
            width={200}
            height={200}
            className="w-full rounded-full cursor-crosshair"
            style={{ aspectRatio: "1/1", maxWidth: 200, margin: "0 auto" }}
            onMouseDown={handleWheelDown}
            onTouchStart={handleWheelDown}
          />
          <div className="mt-2 flex items-center gap-2">
            <canvas
              ref={sliderRef}
              width={20}
              height={160}
              className="h-24 w-3 cursor-pointer rounded"
              style={{ minWidth: 12 }}
              onMouseDown={handleSliderDown}
              onTouchStart={handleSliderDown}
            />
            <div className="flex-1">
              <div className="grid grid-cols-8 gap-0.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-5 w-full rounded border border-border cursor-pointer"
                    style={{ backgroundColor: c }}
                    onClick={() => { onChange(c); setOpen(false); }}
                    title={c}
                  />
                ))}
              </div>
              <button
                type="button"
                className="mt-2 w-full h-7 rounded text-[10px] text-center"
                style={{ backgroundColor: hslToHex(hue, sat, light), border: "1px solid #666" }}
                onClick={() => { onChange(hslToHex(hue, sat, light)); setOpen(false); }}
              >
                Select
              </button>
            </div>
          </div>
          {hasEyedropper && (
            <button
              type="button"
              className="mt-2 w-full h-7 rounded border border-border text-[10px] flex items-center justify-center gap-1 hover:bg-accent"
              onClick={handleEyedrop}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 22l1-1h3l9-9M6 21l9-9" />
                <path d="M17.5 6.5l-3-3M19 5l3-3" />
                <path d="M14 8l-3-3" />
                <circle cx="17" cy="7" r="1" fill="currentColor" />
              </svg>
              Eyedropper
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
