"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
  onMouseDown: (clientX: number, clientY: number) => void;
  onMouseMove: (clientX: number, clientY: number) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  brushSizeRef.current = brushSize;

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(5, +(z * 1.4).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.25, +(z / 1.4).toFixed(2))), []);
  const zoomReset = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);

  const adjustCoord = useCallback((clientX: number, clientY: number) => {
    return { x: clientX + panX, y: clientY + panY };
  }, [panX, panY]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      return;
    }
    if (panMode) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      return;
    }
    const a = adjustCoord(e.clientX, e.clientY);
    onMouseDown(a.x, a.y);
  }, [onMouseDown, adjustCoord, panX, panY, panMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanX(panStartRef.current.px + dx);
      setPanY(panStartRef.current.py + dy);
      return;
    }
    const a = adjustCoord(e.clientX, e.clientY);
    onMouseMove(a.x, a.y);
  }, [isPanning, onMouseMove, adjustCoord]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }
    onMouseUp();
  }, [isPanning, onMouseUp]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 / 1.2 : 1.2;
      setZoom((z) => {
        const next = Math.min(5, Math.max(0.25, +(z * delta).toFixed(2)));
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !cursorRef.current || !container) return;
    const cr = container.getBoundingClientRect();
    const s = canvas.width / cr.width;
    cursorRef.current.style.width = `${brushSize / s}px`;
    cursorRef.current.style.height = `${brushSize / s}px`;
  }, [brushSize, canvasRef, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const updateCursor = (e: MouseEvent) => {
      if (!cursorRef.current) return;
      const cr = container.getBoundingClientRect();
      const s = canvas.width / cr.width;
      cursorRef.current.style.left = `${e.clientX - cr.left}px`;
      cursorRef.current.style.top = `${e.clientY - cr.top}px`;
      cursorRef.current.style.width = `${brushSizeRef.current / s}px`;
      cursorRef.current.style.height = `${brushSizeRef.current / s}px`;
      cursorRef.current.style.display = panMode ? "none" : "block";
    };
    canvas.addEventListener("mousemove", updateCursor);
    return () => canvas.removeEventListener("mousemove", updateCursor);
  }, [canvasRef, zoom, panMode]);

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
          ref={containerRef}
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
            style={{
              imageRendering: "auto",
              cursor: isPanning ? "grabbing" : (panMode ? "grab" : "none"),
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseEnter={() => { if (cursorRef.current) cursorRef.current.style.display = "block"; }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
          <div
            ref={cursorRef}
            className="pointer-events-none absolute rounded-full border-2 z-10"
            style={{
              borderColor: brushMode === "erase" ? "#ef4444" : "#22c55e",
              backgroundColor: brushMode === "erase" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
              transform: "translate(-50%, -50%)",
              display: "none",
            }}
          />

          <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
            <button
              type="button"
              onClick={() => setPanMode((p) => !p)}
              className={`w-7 h-7 flex items-center justify-center rounded text-white text-sm transition-colors ${
                panMode ? "bg-primary hover:bg-primary/80" : "bg-black/50 hover:bg-black/70"
              }`}
              title={panMode ? "Switch to draw mode" : "Switch to pan mode"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 2 2v4.6A4.4 4.4 0 0 1 15.6 19h-2.2a6 6 0 0 1-4.22-1.78l-3.15-3.16a1.5 1.5 0 0 1 0-2.12l.1-.1A1.5 1.5 0 0 1 7.8 12.2L10 14"/></svg>
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
              title="Zoom out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button
              type="button"
              onClick={zoomReset}
              className="h-7 px-1.5 flex items-center justify-center rounded bg-black/50 text-white text-xs font-medium hover:bg-black/70 transition-colors min-w-[48px]"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="w-7 h-7 flex items-center justify-center rounded bg-black/50 text-white text-sm hover:bg-black/70 transition-colors"
              title="Zoom in"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {brushMode === "erase"
            ? "Paint over areas the AI missed to remove them"
            : "Paint over areas the AI incorrectly removed to restore them"}
          <br />
          <span className="text-[10px]">Ctrl+Scroll to zoom &bull; Click pan icon to toggle pan mode</span>
        </p>
      </CardContent>
    </Card>
  );
}
