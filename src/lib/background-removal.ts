import sharp from "sharp";
import { generateId } from "@/lib/utils";
import path from "path";
import fs from "fs/promises";
import { Prisma } from "@prisma/client";

interface RemoveBgOptions {
  inputPath: string;
  outputDir: string;
  imageId: string;
}

interface RemoveBgResult {
  outputPath: string;
  thumbnailPath: string;
  processingTime: number;
}

export async function removeBackgroundLocally(
  options: RemoveBgOptions
): Promise<RemoveBgResult> {
  const { inputPath, outputDir, imageId } = options;
  const startTime = Date.now();

  const outputFilename = `${imageId}-transparent.png`;
  const thumbnailFilename = `${imageId}-thumb.png`;
  const outputPath = path.join(outputDir, outputFilename);
  const thumbnailPath = path.join(outputDir, thumbnailFilename);

  await fs.mkdir(outputDir, { recursive: true });

  try {
    const inputBuffer = await fs.readFile(inputPath);
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const { width, height } = metadata;

    const rgbaBuffer = await image
      .ensureAlpha()
      .raw()
      .toBuffer();

    const pixelData = new Uint8Array(rgbaBuffer);
    const totalPixels = pixelData.length / 4;

    const colorRanges = analyzeColorRanges(pixelData, width || 0, height || 0);

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4;
      const r = pixelData[offset];
      const g = pixelData[offset + 1];
      const b = pixelData[offset + 2];

      const alpha = calculateAlpha(r, g, b, colorRanges, i, width || 0);
      pixelData[offset + 3] = alpha;
    }

    const processedImage = sharp(pixelData, {
      raw: {
        width: width || 0,
        height: height || 0,
        channels: 4,
      },
    });

    await processedImage.png().toFile(outputPath);

    const thumbImage = sharp(pixelData, {
      raw: {
        width: width || 0,
        height: height || 0,
        channels: 4,
      },
    });
    const maxThumbSize = 300;
    if ((width || 0) > maxThumbSize || (height || 0) > maxThumbSize) {
      await thumbImage
        .resize(maxThumbSize, maxThumbSize, { fit: "inside" })
        .png()
        .toFile(thumbnailPath);
    } else {
      await thumbImage.png().toFile(thumbnailPath);
    }

    const processingTime = Date.now() - startTime;

    return { outputPath, thumbnailPath, processingTime };
  } catch (error) {
    throw error;
  }
}

function analyzeColorRanges(
  pixels: Uint8Array,
  width: number,
  height: number
): ColorRanges {
  const samples: { r: number; g: number; b: number }[] = [];

  const edgeSize = Math.min(20, Math.floor(Math.min(width, height) * 0.05));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        x < edgeSize ||
        x >= width - edgeSize ||
        y < edgeSize ||
        y >= height - edgeSize
      ) {
        const idx = (y * width + x) * 4;
        samples.push({
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
        });
      }
    }
  }

  const rValues = samples.map((s) => s.r);
  const gValues = samples.map((s) => s.g);
  const bValues = samples.map((s) => s.b);

  const meanR = average(rValues);
  const meanG = average(gValues);
  const meanB = average(bValues);

  const stdR = stdDev(rValues, meanR);
  const stdG = stdDev(gValues, meanG);
  const stdB = stdDev(bValues, meanB);

  const threshold = Math.max(stdR, stdG, stdB) * 1.5;

  return {
    bgColor: { r: meanR, g: meanG, b: meanB },
    threshold,
  };
}

interface ColorRanges {
  bgColor: { r: number; g: number; b: number };
  threshold: number;
}

function calculateAlpha(
  r: number,
  g: number,
  b: number,
  ranges: ColorRanges,
  pixelIndex: number,
  width: number
): number {
  const dr = Math.abs(r - ranges.bgColor.r);
  const dg = Math.abs(g - ranges.bgColor.g);
  const db = Math.abs(b - ranges.bgColor.b);

  const distance = Math.sqrt(dr * dr + dg * dg + db * db);

  if (distance < ranges.threshold * 0.5) {
    return 0;
  }
  if (distance < ranges.threshold * 2) {
    const t = (distance - ranges.threshold * 0.5) / (ranges.threshold * 1.5);
    return Math.round(Math.min(255, t * 255));
  }
  return 255;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(average(squaredDiffs));
}

export async function removeBackgroundWithAPI(
  inputPath: string,
  outputDir: string,
  imageId: string,
  api: "replicate" | "removebg" = "replicate"
): Promise<RemoveBgResult> {
  const startTime = Date.now();
  const outputFilename = `${imageId}-transparent.png`;
  const outputPath = path.join(outputDir, outputFilename);
  const thumbnailFilename = `${imageId}-thumb.png`;
  const thumbnailPath = path.join(outputDir, thumbnailFilename);

  await fs.mkdir(outputDir, { recursive: true });

  try {
    if (api === "replicate") {
      await processWithReplicate(inputPath, outputPath);
    } else {
      await processWithRemoveBg(inputPath, outputPath);
    }

    const thumbBuffer = await sharp(outputPath)
      .resize(300, 300, { fit: "inside" })
      .png()
      .toBuffer();
    await fs.writeFile(thumbnailPath, thumbBuffer);

    const processingTime = Date.now() - startTime;
    return { outputPath, thumbnailPath, processingTime };
  } catch (error) {
    throw error;
  }
}

async function processWithReplicate(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const inputBuffer = await fs.readFile(inputPath);
  const base64Image = inputBuffer.toString("base64");
  const mimeType = "image/png";
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const output = await replicate.run(
    "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    {
      input: {
        image: dataUri,
      },
    }
  );

  if (output && typeof output === "string") {
    const response = await fetch(output);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
  } else {
    throw new Error("Replicate API returned unexpected result");
  }
}

async function processWithRemoveBg(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("image_file", await fs.readFile(inputPath), {
    filename: "image.png",
    contentType: "image/png",
  });
  form.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.REMOVE_BG_API_KEY || "",
    },
    body: form as unknown as BodyInit,
  });

  if (!response.ok) {
    throw new Error(`Remove.bg API error: ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}

export { removeBackgroundWithAPI as removeBackground };
