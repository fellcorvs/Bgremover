"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload } from "lucide-react";

const SIZES = [
  { name: "US Passport", w: 600, h: 600, label: "2×2 in (600×600 px)" },
  { name: "EU Passport", w: 413, h: 531, label: "35×45 mm (413×531 px)" },
  { name: "UK Passport", w: 413, h: 531, label: "35×45 mm (413×531 px)" },
  { name: "India Passport", w: 413, h: 531, label: "35×45 mm (413×531 px)" },
  { name: "China Visa", w: 413, h: 531, label: "33×48 mm (413×531 px)" },
  { name: "Custom", w: 400, h: 500, label: "Custom" },
];

export default function PassportTool() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(0);
  const [customW, setCustomW] = useState(400);
  const [customH, setCustomH] = useState(500);
  const [bgColor, setBgColor] = useState("#ffffff");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setResult(null); }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const applyPassport = () => {
    if (!image) return;
    const sz = SIZES[selectedSize];
    const w = sz.name === "Custom" ? customW : sz.w;
    const h = sz.name === "Custom" ? customH : sz.h;
    const imgEl = document.createElement("img");
    imgEl.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
      const s = Math.min(w / imgEl.naturalWidth, h / imgEl.naturalHeight) * 0.8;
      const dw = imgEl.naturalWidth * s, dh = imgEl.naturalHeight * s;
      ctx.drawImage(imgEl, (w - dw) / 2, (h - dh) / 2, dw, dh);
      canvas.toBlob((b) => { if (b) setResult(URL.createObjectURL(b)); });
    };
    imgEl.src = image;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="13" width="8" height="2" rx="1"/><rect x="8" y="9" width="4" height="2" rx="1"/></svg>
          <h1 className="text-3xl font-bold">Passport ID Maker</h1>
        </div>
        {!image ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed border-border/50 p-12 hover:border-primary/50 transition-colors" onClick={triggerUpload} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-lg font-medium">Upload a photo to create passport/ID photo</span>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Image</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <Image src={image} alt="Source" width={400} height={500} className="w-full max-h-80 object-contain rounded-lg bg-muted" />
                <div><Label>Photo Size</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {SIZES.map((s, i) => (
                      <Button key={s.name} variant={selectedSize === i ? "default" : "outline"} size="sm" onClick={() => setSelectedSize(i)}>
                        {s.name}<br /><span className="text-[10px] opacity-70">{s.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                {SIZES[selectedSize].name === "Custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Width (px)</Label><Input type="number" value={customW} onChange={(e) => setCustomW(parseInt(e.target.value) || 1)} /></div>
                    <div><Label>Height (px)</Label><Input type="number" value={customH} onChange={(e) => setCustomH(parseInt(e.target.value) || 1)} /></div>
                  </div>
                )}
                <div><Label>Background Color</Label><Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-10 mt-1" /></div>
                <Button onClick={applyPassport} className="w-full"><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="13" width="8" height="2" rx="1"/><rect x="8" y="9" width="4" height="2" rx="1"/></svg> Generate ID Photo</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Result</h3>
                {result ? (
                  <div className="space-y-3">
                    <Image src={result} alt="Passport" width={300} height={400} className="w-full max-h-80 object-contain rounded-lg border" />
                    <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "passport.png"; a.click(); }}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Select size and click Generate</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
