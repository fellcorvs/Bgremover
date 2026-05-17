"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";


const IMG_URL = "https://picsum.photos/seed/demo/800/500";

export function BeforeAfterDemo() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = () => { dragging.current = true; };
  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);
  const handleMouseMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSliderPos(x * 100);
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove as any);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove as any);
    };
  }, [handleMouseUp, handleMouseMove]);

  useEffect(() => {
    if (!isPlaying) return;
    let dir = 1;
    const timer = setInterval(() => {
      setSliderPos((prev) => {
        if (prev >= 90) dir = -1;
        if (prev <= 10) dir = 1;
        return prev + dir * 0.8;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="max-w-3xl mx-auto mt-10"
    >
      <div className="relative rounded-2xl overflow-hidden border bg-card shadow-2xl group">
        <div className="relative aspect-video" ref={containerRef}>
          <img src={IMG_URL} alt="Before" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img src={IMG_URL} alt="After" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0" style={{ background: "repeating-conic-gradient(rgba(0,0,0,0.06) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px" }} />
          </div>
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-col-resize z-10"
            style={{ left: `${sliderPos}%` }}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-blue-500 flex items-center justify-center cursor-col-resize">
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 3L3 8l5 5"/><path d="M16 3l5 5-5 5"/><path d="M3 16h18"/></svg>
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-md backdrop-blur-sm">Before</div>
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-md backdrop-blur-sm">After</div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-white/90 shadow-xl flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors">
              {isPlaying ? (
                <svg className="w-7 h-7 text-gray-900" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg className="w-7 h-7 text-gray-900 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </div>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-16 pointer-events-none" />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">Drag the slider to compare before and after — or hit play for auto demo</p>
    </motion.div>
  );
}
