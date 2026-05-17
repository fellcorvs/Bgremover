"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UploadedFile } from "@/types";

interface ProcessingQueueProps {
  files: UploadedFile[];
  onRemove?: (id: string) => void;
}

export function ProcessingQueue({ files, onRemove }: ProcessingQueueProps) {
  if (files.length === 0) return null;

  const completed = files.filter((f) => f.status === "completed").length;
  const failed = files.filter((f) => f.status === "failed").length;
  const processing = files.filter((f) => f.status === "processing").length;
  const total = files.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          Queue ({completed + failed}/{total})
        </h3>
        <div className="flex gap-2">
          {processing > 0 && (
            <Badge variant="warning">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing {processing}
            </Badge>
          )}
          {completed > 0 && (
            <Badge variant="success">{completed} Done</Badge>
          )}
          {failed > 0 && (
            <Badge variant="destructive">{failed} Failed</Badge>
          )}
        </div>
      </div>

      <Progress value={(completed / total) * 100} className="h-2" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence>
          {files.map((file) => (
            <motion.div
              key={file.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "relative rounded-xl overflow-hidden border aspect-square group",
                file.status === "failed" && "border-destructive/50",
                file.status === "completed" && "border-emerald-500/50"
              )}
            >
              <img
                src={file.status === "completed" && file.result ? file.result : file.preview}
                alt={file.originalName}
                className={cn(
                  "w-full h-full object-cover",
                  file.status === "completed" && file.result && "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4y2N4+vTpfwYqAiYqApOTk2F0dBTGQAYGBgYqApgq8PfvX4Y/f/4wUJUAADM5D/2s+XgGAAAAAElFTkSuQmCC')] bg-repeat"
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              <div className="absolute top-2 right-2">
                {file.status === "completed" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                )}
                {file.status === "failed" && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {file.status === "processing" && (
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                )}
                {file.status === "pending" && (
                  <div className="h-5 w-5 rounded-full bg-muted-foreground/50" />
                )}
              </div>

              <div className="absolute bottom-0 inset-x-0 p-2">
                <p className="text-white text-xs truncate font-medium">
                  {file.originalName}
                </p>
                {file.result && file.status === "completed" && (
                  <img
                    src={file.result}
                    alt=""
                    className="hidden"
                    onLoad={() => {
                      // Preload result image
                    }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
