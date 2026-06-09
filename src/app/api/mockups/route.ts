import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

const MOCKUP_DIR =
  process.env.MOCKUP_LIBRARY_DIR ||
  path.join(process.env.USERPROFILE || "C:\\Users\\acer", "Pictures", "MOCKUP LIBRARY");

const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (name) {
      const filePath = path.join(MOCKUP_DIR, name);
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(MOCKUP_DIR);
      if (!resolvedPath.startsWith(resolvedDir)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const ext = path.extname(resolvedPath).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
      }
      const buffer = await readFile(resolvedPath);
      const mimeTypes: Record<string, string> = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
      };
      return new NextResponse(buffer, {
        headers: { "Content-Type": mimeTypes[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000" },
      });
    }

    const files = await readdir(MOCKUP_DIR);
    const images = files
      .filter((f) => ALLOWED_EXTS.includes(path.extname(f).toLowerCase()))
      .sort()
      .map((f) => ({ name: f, url: `/api/mockups?name=${encodeURIComponent(f)}` }));
    return NextResponse.json({ success: true, images });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to read mockup library" }, { status: 500 });
  }
}
