"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload } from "lucide-react";

const FONTS = ["Arial", "Georgia", "Courier New", "Verdana", "Impact", "Comic Sans MS"];

export default function TextTool() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [text, setText] = useState("Your Text Here");
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState("#ffffff");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImage(URL.createObjectURL(file)); setResult(null); }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const applyText = () => {
    if (!image) return;
    const imgEl = document.createElement("img");
    imgEl.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imgEl, 0, 0);
      ctx.font = `${fontSize}px ${font}`;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";
      const lines = text.split("\n");
      lines.forEach((line, i) => ctx.fillText(line, (x / 100) * canvas.width, (y / 100) * canvas.height + i * fontSize * 1.2));
      canvas.toBlob((b) => { if (b) setResult(URL.createObjectURL(b)); });
    };
    imgEl.src = image;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
          <h1 className="text-3xl font-bold">Photo Text</h1>
        </div>
        {!image ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex flex-col items-center gap-4 cursor-pointer rounded-xl border-2 border-dashed border-border/50 p-12 hover:border-primary/50 transition-colors" onClick={triggerUpload} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") triggerUpload(); }}>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-lg font-medium">Upload an image to add text</span>
                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); triggerUpload(); }}>Choose Image</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <Image ref={imgRef} src={image} alt="Source" width={600} height={400} className="w-full rounded-lg" />
                <div><Label>Text</Label><Input value={text} onChange={(e) => setText(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Font</Label><select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={font} onChange={(e) => setFont(e.target.value)}>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
                  <div><Label>Size</Label><Input type="number" min={8} max={200} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value) || 48)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Color</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" /></div>
                  <div><Label>X%</Label><Input type="number" min={0} max={100} value={x} onChange={(e) => setX(parseInt(e.target.value) || 0)} /></div>
                  <div><Label>Y%</Label><Input type="number" min={0} max={100} value={y} onChange={(e) => setY(parseInt(e.target.value) || 0)} /></div>
                </div>
                <Button onClick={applyText} className="w-full"><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg> Apply Text</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Result</h3>
                {result ? (
                  <div className="space-y-3">
                    <Image src={result} alt="Text" width={600} height={400} className="w-full rounded-lg" />
                    <Button className="w-full" onClick={() => { const a = document.createElement("a"); a.href = result; a.download = "text.png"; a.click(); }}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">Configure text and click Apply</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
