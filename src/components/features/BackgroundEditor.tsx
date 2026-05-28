"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackgroundOptions } from "@/types";
import { ImageIcon, Droplets, Eye, Image as ImageIcon2, Upload } from "lucide-react";

interface BackgroundEditorProps {
  current: BackgroundOptions;
  onChange: (options: BackgroundOptions) => void;
  disabled?: boolean;
}

const colorPresets = [
  "#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#ff00ff", "#00ffff", "#808080", "#ffa500",
  "#ffc0cb", "#f0f0f0", "#333333", "#8b4513", "#2ecc71",
];

export function BackgroundEditor({ current, onChange, disabled }: BackgroundEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onChange({ ...current, imageUrl: url });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <Tabs
        value={current.type}
        onValueChange={(value) =>
          onChange({ ...current, type: value as BackgroundOptions["type"] })
        }
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full h-8">
          <TabsTrigger value="transparent" disabled={disabled} className="text-xs gap-1">
            <Eye className="h-3 w-3" />
            None
          </TabsTrigger>
          <TabsTrigger value="color" disabled={disabled} className="text-xs gap-1">
            <Droplets className="h-3 w-3" />
            Color
          </TabsTrigger>
          <TabsTrigger value="blur" disabled={disabled} className="text-xs gap-1">
            <Eye className="h-3 w-3" />
            Blur
          </TabsTrigger>
          <TabsTrigger value="image" disabled={disabled} className="text-xs gap-1">
            <ImageIcon2 className="h-3 w-3" />
            Image
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {current.type === "color" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg border-2 shadow-sm shrink-0"
              style={{ backgroundColor: current.color || "#ffffff" }}
            />
            <Input
              type="color"
              value={current.color || "#ffffff"}
              onChange={(e) => onChange({ ...current, color: e.target.value })}
              className="w-12 h-8 p-0.5 cursor-pointer"
              disabled={disabled}
            />
            <Input
              value={current.color || "#ffffff"}
              onChange={(e) => onChange({ ...current, color: e.target.value })}
              className="flex-1 font-mono text-xs"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => onChange({ ...current, color })}
                className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                  current.color === color
                    ? "border-primary scale-110 shadow-lg"
                    : "border-border"
                }`}
                style={{ backgroundColor: color }}
                disabled={disabled}
              />
            ))}
          </div>
        </motion.div>
      )}

      {current.type === "blur" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Blur:</span>
            <Slider
              value={[current.blurRadius || 10]}
              onValueChange={([v]) => onChange({ ...current, blurRadius: v })}
              min={0}
              max={50}
              step={1}
              disabled={disabled}
              className="flex-1"
            />
            <span className="text-xs font-mono w-8 text-right">{current.blurRadius || 10}px</span>
          </div>
        </motion.div>
      )}

      {current.type === "image" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={current.imageUrl || ""}
              onChange={(e) => onChange({ ...current, imageUrl: e.target.value })}
              disabled={disabled}
              className="text-xs h-8"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-3 w-3" /> Browse
            </Button>
          </div>
          {current.imageUrl && (
            <div className="relative w-full h-16 rounded-lg overflow-hidden border">
              <img src={current.imageUrl} alt="bg" className="w-full h-full object-cover" />
            </div>
          )}
        </motion.div>
      )}

      {current.type === "transparent" && (
        <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
          <Eye className="h-5 w-5 mx-auto mb-1 opacity-50" />
          <p className="text-xs">
            Transparent background. Download as PNG.
          </p>
        </div>
      )}


    </motion.div>
  );
}
