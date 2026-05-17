"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Image } from "lucide-react";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x * 20);
        mouseY.set(y * 20);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-purple-500/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "-2s" }} />

      <motion.div
        style={{ x: springX, y: springY }}
        className="container relative z-10 text-center py-16"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-8"
        >
          <Shield className="h-4 w-4" />
          100% Free · No Sign Up Required
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
        >
          Remove Backgrounds Instantly
          <br />
          <span className="gradient-text">with High-Precision AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Upload an image and let our high-precision AI remove the background automatically. 
          All processing happens in your browser — nothing is uploaded to any server. 
          Plus enjoy free tools like Crop Image, Currency Converter, and Scientific Calculator.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link href="/editor">
            <Button size="xl" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl shadow-purple-500/25 group">
              Try Background Remover
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/about">
            <Button size="xl" variant="outline">
              Learn How It Works
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-3 bg-background/50 rounded-xl p-4 border">
            <Image className="h-8 w-8 text-blue-500 shrink-0" />
            <div className="text-left">
              <div className="font-medium text-foreground">Precise Background Removal</div>
              <div className="text-xs">High-precision AI detects hair, fur, and fine details</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background/50 rounded-xl p-4 border">
            <Shield className="h-8 w-8 text-emerald-500 shrink-0" />
            <div className="text-left">
              <div className="font-medium text-foreground">100% Private</div>
              <div className="text-xs">All processing stays in your browser. Zero uploads.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-background/50 rounded-xl p-4 border">
            <Zap className="h-8 w-8 text-purple-500 shrink-0" />
            <div className="text-left">
              <div className="font-medium text-foreground">Totally Free</div>
              <div className="text-xs">No credits, no limits, no subscriptions. Use forever.</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
