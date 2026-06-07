import path from "path";
import fs from "fs";

const OUTPUT = path.join(process.cwd(), "public", "bria_rmbg.onnx");

async function main() {
  if (fs.existsSync(OUTPUT) && fs.statSync(OUTPUT).size > 1_000_000) {
    console.log("BRIA model already exists at", OUTPUT);
    return;
  }

  const url = process.env.BRIA_ONNX_URL;
  if (!url) {
    console.log("BRIA_ONNX_URL not set — model will be exported at cold start via getModelPath()");
    return;
  }

  console.log(`Downloading BRIA ONNX model from ${url}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.statusText}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`Saved to ${OUTPUT} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
