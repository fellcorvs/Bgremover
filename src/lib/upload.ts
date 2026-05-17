import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateId } from "@/lib/utils";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760");
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/jpg"];

export interface UploadResult {
  id: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
}

export async function validateUploadFile(
  file: File | { name: string; size: number; type: string }
): Promise<{ valid: boolean; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Allowed: PNG, JPG, JPEG, WEBP`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Max size: ${Math.round(
        MAX_FILE_SIZE / 1024 / 1024
      )}MB`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  return { valid: true };
}

export async function saveUploadedFile(
  file: File,
  userId?: string
): Promise<UploadResult> {
  const id = generateId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `${id}-original.${ext}`;

  const userDir = userId ? path.join(UPLOAD_DIR, "users", userId) : path.join(UPLOAD_DIR, "temp");
  const filePath = path.join(userDir, filename);

  await mkdir(userDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  let width = 0;
  let height = 0;
  try {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width || 0;
    height = metadata.height || 0;
  } catch {
    width = 0;
    height = 0;
  }

  return {
    id,
    originalName: file.name,
    path: filePath,
    size: file.size,
    mimeType: file.type,
    width,
    height,
  };
}

export function getUploadPath(subdir = ""): string {
  return path.join(UPLOAD_DIR, subdir);
}

export async function cleanupTempFiles(maxAgeMs = 3600000): Promise<number> {
  const { readdir, unlink, stat } = await import("fs/promises");
  const tempDir = path.join(UPLOAD_DIR, "temp");
  let cleaned = 0;

  try {
    const files = await readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await stat(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        await unlink(filePath);
        cleaned++;
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  return cleaned;
}
