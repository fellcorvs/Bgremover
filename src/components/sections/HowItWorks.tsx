"use client";

import { motion } from "framer-motion";
import { Upload, Zap, Download, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Image",
    description: "Drag and drop your image or click to browse. Supports PNG, JPG, WEBP formats.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "AI Processing",
    description: "Our AI automatically detects and removes the background with pixel-perfect accuracy.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Download,
    title: "Download Result",
    description: "Download your image with transparent background. PNG, JPG formats available.",
    color: "from-emerald-500 to-teal-500",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to remove backgrounds from your images.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              <div className="inline-flex mb-6 relative">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 shadow-xl`}>
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                    <step.icon className="h-10 w-10 text-foreground" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                  {i + 1}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
