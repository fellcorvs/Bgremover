import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import { BackgroundOptions } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateRelative(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isValidImageFile(file: File): boolean {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
  const maxSize = 10 * 1024 * 1024;
  return allowedTypes.includes(file.type) && file.size <= maxSize;
}

export function isValidImageMimeType(mimeType: string): boolean {
  return ["image/png", "image/jpeg", "image/webp", "image/jpg"].includes(
    mimeType
  );
}

export function createImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/file/${path}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function createMaskFromTransparent(
  transparentUrl: string,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = transparentUrl;
  });

  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);

  for (let i = 3; i < data.data.length; i += 4) {
    const alpha = data.data[i];
    data.data[i - 3] = 255;
    data.data[i - 2] = 255;
    data.data[i - 1] = 255;
    data.data[i] = alpha > 128 ? 255 : 0;
  }
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else resolve(transparentUrl);
    }, "image/png");
  });
}

export async function compositeBackground(
  processedBlobUrl: string,
  originalUrl: string,
  options: BackgroundOptions
): Promise<string> {
  const hasFilters = options.filters && (
    options.filters.brightness !== 100 ||
    options.filters.contrast !== 100 ||
    options.filters.saturation !== 100 ||
    (options.filters.shadow || 0) > 0
  );

  if (options.type === "transparent" && !hasFilters) return processedBlobUrl;

  const [processedImg, originalImg] = await Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = processedBlobUrl;
    }),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = originalUrl;
    }),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = processedImg.naturalWidth || processedImg.width;
  canvas.height = processedImg.naturalHeight || processedImg.height;
  const ctx = canvas.getContext("2d")!;

  if (options.type === "color") {
    ctx.fillStyle = options.color || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (options.type === "blur") {
    ctx.fillStyle = options.color || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `blur(${options.blurRadius || 10}px)`;
    ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
  } else if (options.type === "image") {
    const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = options.imageUrl || "";
    });
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  }

  if (options.filters) {
    const { brightness, contrast, saturation, shadow } = options.filters;
    const parts = [`brightness(${brightness}%)`, `contrast(${contrast}%)`, `saturate(${saturation}%)`];
    if (shadow && shadow > 0) parts.push(`drop-shadow(0 0 ${shadow}px rgba(0,0,0,${Math.min(1, shadow / 20)}))`);
    ctx.filter = parts.join(" ");
  }
  ctx.drawImage(processedImg, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(processedBlobUrl);
      }
    }, "image/png");
  });
}
