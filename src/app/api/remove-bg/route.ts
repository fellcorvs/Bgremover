import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateId } from "@/lib/utils";
import prisma from "@/lib/db";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const method = formData.get("method") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const id = generateId();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const inputFilename = `${id}-input.${ext}`;
    const outputFilename = `${id}-output.png`;
    const outputDir = path.join(UPLOAD_DIR, "processed", id);

    await mkdir(outputDir, { recursive: true });

    const inputPath = path.join(outputDir, inputFilename);
    const outputPath = path.join(outputDir, outputFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    try {
      const processedBuffer = await removeBackgroundAdvanced(buffer, width, height);
      await writeFile(outputPath, processedBuffer);

      const relativePath = `processed/${id}/${outputFilename}`;
      const processedUrl = `/api/file/${relativePath}`;

      await prisma.image.create({
        data: {
          originalName: file.name,
          originalPath: inputPath,
          processedPath: outputPath,
          mimeType: file.type,
          size: file.size,
          width,
          height,
          status: "completed",
        },
      });

      return NextResponse.json({
        success: true,
        data: { id, processedUrl, originalName: file.name, width, height },
      });
    } catch (processingError) {
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : "Background removal failed";

      await prisma.image.create({
        data: {
          originalName: file.name,
          originalPath: inputPath,
          mimeType: file.type,
          size: file.size,
          status: "failed",
          metadata: JSON.stringify({ error: errorMessage }),
        },
      });

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Remove BG error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function removeBackgroundAdvanced(
  input: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const totalPixels = width * height;

  const bgColor = sampleBackgroundColor(pixels, width, height);
  const colorStd = calculateColorStd(pixels, width, height, bgColor);

  const threshold = Math.max(colorStd * 2.5, 30);

  const output = new Uint8Array(totalPixels * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const dr = r - bgColor.r;
      const dg = g - bgColor.g;
      const db = b - bgColor.b;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);

      let alpha: number;
      if (distance <= threshold * 0.4) {
        alpha = 0;
      } else if (distance >= threshold) {
        alpha = 255;
      } else {
        const t = (distance - threshold * 0.4) / (threshold * 0.6);
        alpha = Math.round(smoothstep(t) * 255);
      }

      output[idx] = r;
      output[idx + 1] = g;
      output[idx + 2] = b;
      output[idx + 3] = alpha;
    }
  }

  return await sharp(output, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function sampleBackgroundColor(
  pixels: Uint8Array,
  width: number,
  height: number
): RGB {
  const sampleSize = 40;
  const stepX = Math.max(1, Math.floor(width / sampleSize));
  const stepY = Math.max(1, Math.floor(height / sampleSize));
  const edgeThickness = Math.max(2, Math.floor(Math.min(width, height) * 0.02));

  const samples: RGB[] = [];

  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const onEdge =
        x < edgeThickness ||
        x >= width - edgeThickness ||
        y < edgeThickness ||
        y >= height - edgeThickness;

      if (onEdge) {
        const idx = (y * width + x) * 4;
        samples.push({ r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] });
      }
    }
  }

  return medianColor(samples);
}

function medianColor(samples: RGB[]): RGB {
  if (samples.length === 0) return { r: 255, g: 255, b: 255 };

  const rs = samples.map((s) => s.r).sort((a, b) => a - b);
  const gs = samples.map((s) => s.g).sort((a, b) => a - b);
  const bs = samples.map((s) => s.b).sort((a, b) => a - b);

  const mid = Math.floor(samples.length / 2);
  return {
    r: rs[mid],
    g: gs[mid],
    b: bs[mid],
  };
}

function calculateColorStd(
  pixels: Uint8Array,
  width: number,
  height: number,
  mean: RGB
): number {
  const edgeThickness = Math.max(2, Math.floor(Math.min(width, height) * 0.02));
  const step = 3;
  let sum = 0;
  let count = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const onEdge =
        x < edgeThickness ||
        x >= width - edgeThickness ||
        y < edgeThickness ||
        y >= height - edgeThickness;

      if (onEdge) {
        const idx = (y * width + x) * 4;
        const dr = pixels[idx] - mean.r;
        const dg = pixels[idx + 1] - mean.g;
        const db = pixels[idx + 2] - mean.b;
        sum += dr * dr + dg * dg + db * db;
        count++;
      }
    }
  }

  return Math.sqrt(sum / count);
}
