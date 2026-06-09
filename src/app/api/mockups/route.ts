import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MOCKUP_DIR = path.join(process.cwd(), "public", "mockups");
const ALLOWED_EXTS = [".glb", ".gltf"];

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (name) {
      const filePath = path.join(MOCKUP_DIR, name);
      const resolvedPath = path.resolve(filePath);
      const resolvedDir = path.resolve(MOCKUP_DIR);
      if (!resolvedPath.startsWith(resolvedDir))
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      const ext = path.extname(resolvedPath).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext))
        return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
      const buffer = await readFile(resolvedPath);
      const mimeTypes: Record<string, string> = {
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
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
  } catch (err) {
    return NextResponse.json({ success: false, error: `Failed to read mockups: ${String(err)}` }, { status: 500 });
  }
}
