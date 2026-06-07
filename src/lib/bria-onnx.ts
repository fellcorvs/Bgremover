import sharp from "sharp";
import path from "path";
import fs from "fs";

let session: any = null;
let ortModule: any = null;
const MODEL_W = 1024;
const MODEL_H = 1024;
const MODEL_URL =
  process.env.BRIA_ONNX_URL ||
  "https://huggingface.co/fellcorvs/bria-rmbg-onnx/resolve/main/bria_rmbg.onnx";

async function ensureOrt() {
  if (ortModule) return ortModule;
  try {
    // dynamic string avoids static analysis — onnxruntime-node is not bundled
    const pkg = "onnxruntime-node";
    // @ts-expect-error — not in package.json, installed manually for local dev
    ortModule = await import(pkg);
    return ortModule;
  } catch {
    throw new Error(
      "onnxruntime-node is not installed. Run: npm install onnxruntime-node"
    );
  }
}

async function getModelPath(): Promise<string> {
  const localPath = path.join(process.cwd(), "public", "bria_rmbg.onnx");
  if (fs.existsSync(localPath)) return localPath;
  const tmpPath = path.join("/tmp", "bria_rmbg.onnx");
  if (fs.existsSync(tmpPath)) return tmpPath;
  const resp = await fetch(MODEL_URL);
  if (!resp.ok) throw new Error(`Failed to download model: ${resp.statusText}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

async function getSession() {
  if (session) return session;
  const ort = await ensureOrt();
  const modelPath = await getModelPath();
  session = await ort.InferenceSession.create(modelPath);
  return session;
}

export async function removeBgWithBriaOnnx(inputPath: string): Promise<Buffer> {
  const sess = await getSession();
  const ort = await ensureOrt();

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const resized = await sharp(inputPath)
    .resize(MODEL_W, MODEL_H, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const input = new Float32Array(3 * MODEL_W * MODEL_H);
  for (let i = 0; i < MODEL_W * MODEL_H; i++) {
    const off = i * 4;
    input[i] = (resized[off] / 255 - 0.5) / 0.5;
    input[MODEL_W * MODEL_H + i] = (resized[off + 1] / 255 - 0.5) / 0.5;
    input[2 * MODEL_W * MODEL_H + i] = (resized[off + 2] / 255 - 0.5) / 0.5;
  }

  const inputTensor = new ort.Tensor("float32", input, [1, 3, MODEL_H, MODEL_W]);
  const outputs = await sess.run({ pixel_values: inputTensor });

  const maskFloat = outputs.mask.data as Float32Array;
  const maskU8 = new Uint8Array(MODEL_W * MODEL_H);
  for (let i = 0; i < MODEL_W * MODEL_H; i++) {
    maskU8[i] = Math.round(Math.max(0, Math.min(255, maskFloat[i] * 255)));
  }
  const maskResized = await sharp(Buffer.from(maskU8), {
    raw: { width: MODEL_W, height: MODEL_H, channels: 1 },
  })
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  const alpha = new Uint8Array(maskResized);
  for (let i = 0; i < width * height; i++) {
    const off = i * 4;
    rgba[off] = data[off];
    rgba[off + 1] = data[off + 1];
    rgba[off + 2] = data[off + 2];
    rgba[off + 3] = Math.round(Math.max(0, Math.min(255, alpha[i])));
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
