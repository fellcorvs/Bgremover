import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MANIFEST_PATH = path.join(process.cwd(), "public", "gallery", "manifest.json");

export async function GET(req: NextRequest) {
  try {
    const text = await readFile(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(text);

    return NextResponse.json({
      success: true,
      categories: manifest.categories,
      categoryOrder: manifest.categoryOrder,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Failed to read gallery: ${String(err)}` }, { status: 500 });
  }
}
