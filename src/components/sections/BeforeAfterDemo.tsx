"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";


const IMG_URL = "/demo-before.jpg";

export function BeforeAfterDemo() {
  const [sliderPos, setSliderPos] = useState(50);
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
    let dir = 1;
    const timer = setInterval(() => {
      setSliderPos((prev) => {
        if (prev >= 90) dir = -1;
        if (prev <= 10) dir = 1;
        return prev + dir * 0.8;
      });
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="max-w-3xl mx-auto mt-10"
    >
      <div className="relative rounded-2xl overflow-hidden border bg-card shadow-2xl group">
        <div className="relative flex items-center justify-center bg-black/5" ref={containerRef}>
          <img src={IMG_URL} alt="Before" className="w-full h-auto max-h-[500px] object-contain" draggable={false} />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img src={IMG_URL} alt="After" className="w-full h-auto max-h-[500px] object-contain block" draggable={false} />
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
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-16 pointer-events-none" />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">Drag the slider to compare before and after</p>
    </motion.div>
  );
}
