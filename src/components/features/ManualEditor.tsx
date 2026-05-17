"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface ManualEditorProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasCallbackRef: (node: HTMLCanvasElement | null) => void;
  isDrawing: boolean;
  brushSize: number;
  brushMode: "erase" | "restore";
  onBrushSizeChange: (size: number) => void;
  onBrushModeChange: (mode: "erase" | "restore") => void;
  onReset: () => void;
  onUndo: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function ManualEditor({
  canvasRef,
  canvasCallbackRef,
  isDrawing,
  brushSize,
  brushMode,
  onBrushSizeChange,
  onBrushModeChange,
  onReset,
  onUndo,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: ManualEditorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateCursor = (e: MouseEvent) => {
      if (!cursorRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      cursorRef.current.style.left = `${e.clientX - rect.left}px`;
      cursorRef.current.style.top = `${e.clientY - rect.top}px`;
      cursorRef.current.style.width = `${brushSizeRef.current / scale}px`;
      cursorRef.current.style.height = `${brushSizeRef.current / scale}px`;
    };
    canvas.addEventListener("mousemove", updateCursor);
    return () => canvas.removeEventListener("mousemove", updateCursor);
  }, [canvasRef]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 5-2-2H7l-4 4 9 9 10-10Z"/><path d="m5 16 5 5"/><path d="M16 10v6"/><path d="M10 16h6"/></svg>
          Manual Refine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={brushMode}
          onValueChange={(v) => onBrushModeChange(v as "erase" | "restore")}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="erase" className="gap-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7l-4-4 9-9 8 8-4 4"/><path d="M18 13l-5-5"/></svg>
              Erase
            </TabsTrigger>
            <TabsTrigger value="restore" className="gap-1">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M21 3v6h-6"/><path d="M3 12a9 9 0 0 1 9-9"/></svg>
              Restore
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>Brush Size: {brushSize}px</Label>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => onBrushSizeChange(v)}
            min={5}
            max={100}
            step={1}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            className="flex-1 gap-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex-1 gap-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            Reset
          </Button>
        </div>

        <div
          className="relative rounded-xl overflow-hidden border"
          style={{
            touchAction: "none",
            backgroundColor: "#808080",
            backgroundImage: "linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        >
          <canvas
            ref={canvasCallbackRef}
            className="block w-full h-auto max-h-[500px]"
            style={{ imageRendering: "auto", cursor: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onMouseEnter={() => { if (cursorRef.current) cursorRef.current.style.display = "block"; }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
          <div
            ref={cursorRef}
            className="pointer-events-none absolute rounded-full border-2 z-10"
            style={{
              width: brushSize,
              height: brushSize,
              borderColor: brushMode === "erase" ? "#ef4444" : "#22c55e",
              backgroundColor:
                brushMode === "erase"
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(34,197,94,0.2)",
              transform: "translate(-50%, -50%)",
              display: "none",
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {brushMode === "erase"
            ? "Paint over areas the AI missed to remove them"
            : "Paint over areas the AI incorrectly removed to restore them"}
        </p>
      </CardContent>
    </Card>
  );
}
