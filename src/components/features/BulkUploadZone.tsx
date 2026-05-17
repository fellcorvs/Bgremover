"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function BulkUploadZone({ onFilesSelected, disabled }: BulkUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    disabled,
    validator: (file) => {
      if (file.size > 10 * 1024 * 1024) {
        return {
          code: "file-too-large",
          message: `File ${file.name} exceeds 10MB limit`,
        };
      }
      return null;
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragActive && !isDragReject && "border-primary bg-primary/10 scale-[1.01]",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          "rounded-full p-4 transition-colors",
          isDragActive ? "bg-primary/20" : "bg-muted"
        )}>
          <Layers className={cn(
            "h-8 w-8",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        <div>
          <p className="text-lg font-semibold">
            {isDragActive
              ? "Drop images here"
              : "Drop multiple images or click to browse"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drop images or click to browse &bull; PNG, JPG, WEBP &bull; Max 10MB each
          </p>
        </div>
      </div>
    </div>
  );
}
