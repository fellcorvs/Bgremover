"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Download, Upload } from "lucide-react";

export default function CircleTool() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [size, setSize] = useState(400);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url); setResult(null);
      const imgEl = document.createElement("img");
      imgEl.onload = () => setSize(Math.min(imgEl.naturalWidth, imgEl.naturalHeight, 800));
      imgEl.src = url;
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const applyCircle = () => {
    if (!image) return;
    const imgEl = document.createElement("img");
    imgEl.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const s = Math.max(imgEl.naturalWidth, imgEl.naturalHeight);
      const sw = (size / s) * imgEl.naturalWidth;
      const sh = (size / s) * imgEl.naturalHeight;
      const sx = (size - sw) / 2, sy = (size - sh) / 2;
      ctx.drawImage(imgEl, sx, sy, sw, sh);
      canvas.toBlob((b) => { if (b) setResult(URL.createObjectURL(b)); });
    };
    imgEl.src = image;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <h1 className="text-3xl font-bold">Circle Photo</h1>
        </div>
        {!image ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed border-border/50 p-12 hover:border-primary/50 transition-colors" onClick={triggerUpload} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-lg font-medium">Upload an image to make circular</span>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Image</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <Image ref={imgRef} src={image} alt="Source" width={600} height={400} className="w-full h-auto" />
                </div>
                <div className="space-y-2">
                  <Label>Circle Size: {size}px</Label>
                  <Slider value={[size]} onValueChange={([v]) => setSize(v)} min={100} max={1000} step={10} />
                </div>
                <Button onClick={applyCircle} className="w-full"><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Create Circle Photo</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Result</h3>
                {result ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <Image src={result} alt="Circled" width={size} height={size} className="rounded-full" style={{ width: Math.min(size, 300), height: Math.min(size, 300) }} />
                    </div>
                    <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "circle.png"; a.click(); }}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Click "Create Circle Photo"</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
