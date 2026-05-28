"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BulkUploadZone } from "@/components/features/BulkUploadZone";
import { ProcessingQueue } from "@/components/features/ProcessingQueue";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UploadedFile } from "@/types";
import { generateId } from "@/lib/utils";
import { preloadModel } from "@/hooks/useBackgroundRemoval";
import JSZip from "jszip";
import {
  Layers,
  Download,
  Sparkles,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BulkPage() {
  useEffect(() => { preloadModel(); }, []);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const cancelledRef = useRef(false);
  const pauseRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => { pauseRef.current = paused; }, [paused]);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const fileItems: UploadedFile[] = newFiles.map((file) => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
      originalName: file.name,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...fileItems]);
  }, []);

  const processAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0 || isProcessing) return;

    cancelledRef.current = false;
    pauseRef.current = false;
    setPaused(false);
    setIsProcessing(true);
    setTotalCount(pendingFiles.length);
    setProcessedCount(0);

    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "processing" as const } : f
      )
    );

    let removeBackground: (file: any, opts?: any) => Promise<Blob>;
    try {
      const mod = await import("@imgly/background-removal");
      removeBackground = mod.removeBackground as any;
    } catch (e) {
      toast({ title: "Failed to load AI model", description: String(e), variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    let completed = 0;
    let failed = 0;
    const total = pendingFiles.length;

    const processOne = async (fileItem: UploadedFile) => {
      if (cancelledRef.current) return;
      while (pauseRef.current && !cancelledRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (cancelledRef.current) return;
      try {
        const blob = await removeBackground(fileItem.file, {
          model: "isnet",
          output: { format: "image/png", quality: 1 },
        } as any);
        const url = URL.createObjectURL(blob);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "completed" as const, result: url, progress: 100 }
              : f
          )
        );
        completed++;
        setProcessedCount(completed + failed);
      } catch (e) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "failed" as const, error: String(e) }
              : f
          )
        );
        failed++;
        console.error("Bulk processing failed for", fileItem.originalName, e);
      }
    };

    const poolSize = Math.min(4, navigator.hardwareConcurrency || 4);
    let idx = 0;

    const BATCH_SIZE = 10;
    const startNextBatch = async (): Promise<void> => {
      while (idx < total && !cancelledRef.current) {
        while (pauseRef.current && !cancelledRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (cancelledRef.current) return;
        const batch = [];
        const batchStart = idx;
        const batchEnd = Math.min(idx + BATCH_SIZE, total);
        for (let i = batchStart; i < batchEnd; i++) {
          batch.push(processOne(pendingFiles[idx++]));
        }
        await Promise.all(batch);
        // Yield to UI thread every batch to prevent freezing
        await new Promise((r) => setTimeout(r, 0));
      }
    };

    const workers = Array.from({ length: poolSize }, () => startNextBatch());
    await Promise.all(workers);

    setIsProcessing(false);
    setPaused(false);
    setProcessedCount(completed + failed);

    if (!cancelledRef.current) {
      toast({
        title: "Batch processing complete",
        description: `${completed} succeeded, ${failed} failed${total > 500 ? ` (${total} total)` : ""}`,
        variant: failed > 0 && completed === 0 ? "destructive" : "success",
      });
    }
  };

  const downloadAll = async () => {
    const completedFiles = files.filter(
      (f) => f.status === "completed" && f.result
    );
    if (completedFiles.length === 0) return;

    const zip = new JSZip();

    for (const f of completedFiles) {
      try {
        const blob = await (await fetch(f.result!)).blob();
        zip.file(f.originalName.replace(/\.[^.]+$/, "") + "-bg-removed.png", blob);
      } catch { /* skip failed */ }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bg-removed-bulk.zip";
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
      if (f.result) URL.revokeObjectURL(f.result);
    });
    setFiles([]);
  };

  const completedCount = files.filter((f) => f.status === "completed").length;
  const hasResults = completedCount > 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bulk Background Remover</h1>
              <p className="text-muted-foreground">
                Process multiple images at once entirely in your browser.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {files.length === 0 ? (
            <BulkUploadZone onFilesSelected={handleFilesSelected} />
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {files.length} images
                  </Badge>
                  {completedCount > 0 && (
                    <Badge variant="success" className="gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      {completedCount} done
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isProcessing && !hasResults && (
                    <Button
                      onClick={processAll}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-full sm:w-auto"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Process All
                    </Button>
                  )}
                  {isProcessing && (
                    <div className="flex gap-2">
                      <Button onClick={() => setPaused((p) => !p)} variant="outline" size="sm">
                        {paused ? "Resume" : "Pause"}
                      </Button>
                      <Button onClick={() => { cancelledRef.current = true; setIsProcessing(false); setPaused(false); }} variant="destructive" size="sm">
                        Cancel
                      </Button>
                      <Button disabled variant="outline" size="sm" className="gap-1">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        {processedCount}/{totalCount}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <ProcessingQueue files={files} />

              {hasResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border rounded-xl p-6 space-y-4"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary shrink-0" />
                        <h3 className="font-semibold text-lg whitespace-nowrap">Processed Results</h3>
                        <Badge variant="secondary" className="ml-2 shrink-0">{completedCount} images</Badge>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={downloadAll} className="flex-1 sm:flex-initial">
                          <Download className="mr-2 h-4 w-4" />
                          Download All (ZIP)
                        </Button>
                        <Button onClick={clearAll} variant="ghost" className="flex-1 sm:flex-initial">
                          Clear All
                        </Button>
                      </div>
                    </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {files.filter(f => f.status === "completed").map((file) => (
                      <div key={file.id} className="relative rounded-xl overflow-hidden border aspect-square group">
                        <img
                          src={file.result}
                          alt={file.originalName}
                          className="w-full h-full object-contain bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4y2N4+vTpfwYqAiYqApOTk2F0dBTGQAYGBgYqApgq8PfvX4Y/f/4wUJUAADM5D/2s+XgGAAAAAElFTkSuQmCC')] bg-repeat"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 pt-8">
                          <p className="text-white text-xs truncate font-medium">
                            {file.originalName.replace(/\.[^.]+$/, "")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!isProcessing && !hasResults && files.length > 0 && (
                <div className="mt-6">
                  <BulkUploadZone
                    onFilesSelected={handleFilesSelected}
                  />
                </div>
              )}
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                All processing happens in your browser &bull; No uploads to server &bull; Privacy guaranteed
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
