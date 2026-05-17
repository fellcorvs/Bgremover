"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  Layers,
  Download,
  Image,
  Shield,
  Palette,
  Crop,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process images in seconds with our optimized AI engine. No waiting in queues.",
  },
  {
    icon: Layers,
    title: "Bulk Processing",
    description: "Upload and process up to 20 images at once. Save time with batch operations.",
  },
  {
    icon: Download,
    title: "Easy Download",
    description: "Download individual images or bulk download as ZIP. Multiple formats supported.",
  },
  {
    icon: Image,
    title: "HD Quality",
    description: "Preserve original image quality. Output at full resolution with transparent PNG.",
  },
  {
    icon: Palette,
    title: "Background Editor",
    description: "Replace with colors, gradients, images, or blur effects. Full creative control.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your images are processed securely. Auto-deleted after 24 hours.",
  },
  {
    icon: Crop,
    title: "Smart Crop",
    description: "Built-in cropping tools to fine-tune your images before and after processing.",
  },
  {
    icon: Sparkles,
    title: "AI Enhanced",
    description: "Advanced AI preserves hair details, fur, and complex edges perfectly.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">remove backgrounds</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for professionals and creators. No design
            skills required.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="group h-full border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
