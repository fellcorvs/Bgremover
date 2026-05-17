"use client";

import { useEffect, useState } from "react";

interface AnimatedProgressProps {
  value: number;
  className?: string;
}

const stages = [
  { at: 0, label: "Initializing..." },
  { at: 5, label: "Loading image..." },
  { at: 10, label: "Preparing AI model..." },
  { at: 15, label: "Downloading model (~80MB)..." },
  { at: 45, label: "Processing image..." },
  { at: 80, label: "Refining edges..." },
  { at: 95, label: "Finalizing..." },
  { at: 100, label: "Done!" },
];

function getStage(value: number): string {
  let label = stages[0].label;
  for (const s of stages) {
    if (value >= s.at) label = s.label;
  }
  return label;
}

export function AnimatedProgress({ value, className }: AnimatedProgressProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const diff = value - displayed;
    if (diff === 0) return;
    const step = Math.max(1, Math.abs(diff) * 0.15);
    const id = setInterval(() => {
      setDisplayed((prev) => {
        const next = prev + (diff > 0 ? step : -step);
        if (Math.abs(value - next) < step) return value;
        return next;
      });
    }, 30);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <style>{`
        @keyframes progressShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes progressGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes progressPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(59,130,246,0.4); }
          50% { box-shadow: 0 0 20px rgba(139,92,246,0.6), 0 0 40px rgba(236,72,153,0.3); }
        }
      `}</style>

      <div className="relative">
        {/* Particles */}
        {value > 0 && value < 100 && (
          <div className="absolute -top-6 left-0 right-0 h-6 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: `${15 + i * 18 + (value * 0.7)}%`,
                  background: i % 2 === 0 ? "#3b82f6" : "#8b5cf6",
                  animation: `floatUp ${1.5 + i * 0.3}s ease-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Track */}
        <div className="relative h-4 bg-secondary/60 rounded-full overflow-hidden">
          {/* Fill */}
          <div
            className="h-full rounded-full relative"
            style={{
              width: `${Math.min(100, Math.max(0, value))}%`,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)",
              backgroundSize: "200% 100%",
              animation: "progressShimmer 2s linear infinite",
              transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Glow orb at leading edge */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(59,130,246,0.3) 60%, transparent 100%)",
                animation: "progressGlow 1.5s ease-in-out infinite, progressPulse 2s ease-in-out infinite",
                right: "-6px",
              }}
            />
          </div>
        </div>

        {/* Glow under the bar */}
        <div
          className="absolute top-0 left-0 h-4 rounded-full opacity-20 pointer-events-none"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            filter: "blur(10px)",
            transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{getStage(value)}</span>
        <span className="font-bold tabular-nums" style={{ color: value < 100 ? "#8b5cf6" : "#22c55e" }}>
          {Math.round(displayed)}%
        </span>
      </div>
    </div>
  );
}
