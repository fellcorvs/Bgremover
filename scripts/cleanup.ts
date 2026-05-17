import { readdir, unlink, stat, rmdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function cleanupDirectory(dir: string): Promise<number> {
  let cleaned = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        cleaned += await cleanupDirectory(fullPath);
        const remaining = await readdir(fullPath);
        if (remaining.length === 0) {
          await rmdir(fullPath);
        }
      } else {
        const stats = await stat(fullPath);
        if (Date.now() - stats.mtimeMs > MAX_AGE_MS) {
          await unlink(fullPath);
          cleaned++;
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`Error cleaning ${dir}:`, error);
    }
  }
  return cleaned;
}

async function main() {
  console.log("Starting cleanup...");
  const cleaned = await cleanupDirectory(UPLOAD_DIR);
  console.log(`Cleaned up ${cleaned} old files`);
  console.log("Cleanup complete!");
}

main().catch(console.error);
