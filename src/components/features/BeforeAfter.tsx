"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BeforeAfterProps {
  before: string;
  after: string;
  className?: string;
}

export function BeforeAfter({ before, after, className }: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setSliderPosition(Math.min(Math.max(percentage, 0), 100));
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative select-none", className)}
    >
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize border bg-muted"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleTouchMove}
      >
        <img
          src={after}
          alt="After"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={before}
            alt="Before"
            className="absolute top-0 left-0 w-full h-full max-w-none object-contain"
            style={{ width: `${100 / (sliderPosition / 100)}%` }}
            draggable={false}
          />
        </div>
        <div
          className="absolute inset-y-0 flex items-center justify-center"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="relative w-1 h-full bg-white/80 shadow-lg" />
          <div className="absolute h-12 w-12 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-primary">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <div className="w-1 h-4 bg-primary rounded-full" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
          Original
        </div>
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
          Processed
        </div>
      </div>
    </motion.div>
  );
}
