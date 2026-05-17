"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackgroundOptions } from "@/types";
import { ImageIcon, Droplets, Eye, Image as ImageIcon2 } from "lucide-react";

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
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <Tabs
        value={current.type}
        onValueChange={(value) =>
          onChange({ ...current, type: value as BackgroundOptions["type"] })
        }
        className="w-full"
      >
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="transparent" disabled={disabled}>
            <Eye className="h-4 w-4 mr-1" />
            None
          </TabsTrigger>
          <TabsTrigger value="color" disabled={disabled}>
            <Droplets className="h-4 w-4 mr-1" />
            Color
          </TabsTrigger>
          <TabsTrigger value="blur" disabled={disabled}>
            <Eye className="h-4 w-4 mr-1" />
            Blur
          </TabsTrigger>
          <TabsTrigger value="image" disabled={disabled}>
            <ImageIcon2 className="h-4 w-4 mr-1" />
            Image
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {current.type === "color" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg border-2 shadow-sm"
              style={{ backgroundColor: current.color || "#ffffff" }}
            />
            <Input
              type="color"
              value={current.color || "#ffffff"}
              onChange={(e) => onChange({ ...current, color: e.target.value })}
              className="w-16 h-10 p-1 cursor-pointer"
              disabled={disabled}
            />
            <Input
              value={current.color || "#ffffff"}
              onChange={(e) => onChange({ ...current, color: e.target.value })}
              className="flex-1 font-mono text-sm"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
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
          className="space-y-4"
        >
          <Label>Blur Radius: {current.blurRadius || 10}px</Label>
          <Slider
            value={[current.blurRadius || 10]}
            onValueChange={([v]) => onChange({ ...current, blurRadius: v })}
            min={0}
            max={50}
            step={1}
            disabled={disabled}
          />
        </motion.div>
      )}

      {current.type === "image" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-4"
        >
          <Label>Background Image URL</Label>
          <Input
            placeholder="https://example.com/bg.jpg"
            value={current.imageUrl || ""}
            onChange={(e) => onChange({ ...current, imageUrl: e.target.value })}
            disabled={disabled}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            Enter a URL to use as background image
          </div>
        </motion.div>
      )}

      {current.type === "transparent" && (
        <div className="rounded-xl border-2 border-dashed p-8 text-center text-muted-foreground">
          <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            Image will have a transparent background.
            <br />
            Download as PNG to preserve transparency.
          </p>
        </div>
      )}

      <div className="pt-6 border-t space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            Subject Adjustments
          </Label>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs px-2 hover:bg-muted"
            onClick={() => onChange({ 
              ...current, 
              filters: { brightness: 100, contrast: 100, saturation: 100 } 
            })}
            disabled={disabled}
          >
            Reset
          </Button>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Brightness</span>
              <span className="text-primary font-mono">{current.filters?.brightness || 100}%</span>
            </div>
            <Slider
              value={[current.filters?.brightness || 100]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => onChange({ 
                ...current, 
                filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100 }), brightness: v } 
              })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Contrast</span>
              <span className="text-primary font-mono">{current.filters?.contrast || 100}%</span>
            </div>
            <Slider
              value={[current.filters?.contrast || 100]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => onChange({ 
                ...current, 
                filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100 }), contrast: v } 
              })}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <span>Saturation</span>
              <span className="text-primary font-mono">{current.filters?.saturation || 100}%</span>
            </div>
            <Slider
              value={[current.filters?.saturation || 100]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => onChange({ 
                ...current, 
                filters: { ...(current.filters || { brightness: 100, contrast: 100, saturation: 100 }), saturation: v } 
              })}
              disabled={disabled}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          * Adjust the subject to better match the selected background.
        </p>
      </div>
    </motion.div>
  );
}
