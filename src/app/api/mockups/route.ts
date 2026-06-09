import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MANIFEST_PATH = path.join(process.cwd(), "public", "mockups", "manifest.json");
const ALLOWED_EXTS = [".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp"];

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (name) {
      const safe = path.normalize(name).replace(/\\/g, "/").replace(/^\.\.(\/|\\|$)/g, "");
      const ext = path.extname(safe).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext))
        return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
      return NextResponse.redirect(new URL(`/mockups/${encodeURI(safe)}`, req.url), 302);
    }

    const text = await readFile(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(text);

    return NextResponse.json({
      success: true,
      categories: manifest.categories,
      categoryOrder: manifest.categoryOrder,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Failed to read mockups: ${String(err)}` }, { status: 500 });
  }
}
