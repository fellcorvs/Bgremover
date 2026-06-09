import { NextRequest, NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const MOCKUP_DIR = path.join(process.cwd(), "public", "mockups");
const ALLOWED_EXTS = [".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp"];

function detectCategory(name: string, subdir?: string): string {
  if (subdir) return subdir;
  const lower = name.toLowerCase();
  if (lower.includes("shirt") || lower.includes("tshirt") || lower.includes("t_shirt") || lower.includes("hoodie") || lower.includes("longsleeve")) return "T-Shirts";
  if (lower.includes("box")) return "Boxes";
  if (lower.includes("bottle") || lower.includes("can")) return "Bottles & Cans";
  if (lower.includes("mug") || lower.includes("cup")) return "Mugs";
  if (lower.includes("cap") || lower.includes("hat")) return "Hats";
  if (lower.includes("bag") || lower.includes("tote")) return "Bags";
  if (lower.includes("phone") || lower.includes("case")) return "Phone Cases";
  return "Other";
}

export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get("name");
    if (name) {
      const safe = path.normalize(name).replace(/\\/g, "/").replace(/^\.\.(\/|\\|$)/g, "");
      const ext = path.extname(safe).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext))
        return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
      return NextResponse.redirect(new URL(`/mockups/${safe}`, req.url), 302);
    }

    const entries = await readdir(MOCKUP_DIR, { withFileTypes: true });
    const categories: Record<string, { name: string; url: string }[]> = {};

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subFiles = await readdir(path.join(MOCKUP_DIR, entry.name));
        const catName = entry.name.replace(/[-_]/g, " ");
        const items = subFiles
          .filter((f) => ALLOWED_EXTS.includes(path.extname(f).toLowerCase()))
          .sort()
          .map((f) => ({ name: `${entry.name}/${f}`, url: `/mockups/${entry.name}/${encodeURIComponent(f)}` }));
        if (items.length > 0) {
          categories[catName] = items;
        }
      } else if (ALLOWED_EXTS.includes(path.extname(entry.name).toLowerCase())) {
        const cat = detectCategory(entry.name);
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ name: entry.name, url: `/mockups/${encodeURIComponent(entry.name)}` });
      }
    }

    for (const key of Object.keys(categories)) {
      categories[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    const categoryOrder = ["Clothing", "T-Shirts", "Boxes", "Bottles & Cans", "Mugs", "Hats", "Bags", "Phone Cases", "Other"];

    for (const cat of categoryOrder) {
      if (!categories[cat]) categories[cat] = [];
    }

    return NextResponse.json({ success: true, categories, categoryOrder });
  } catch (err) {
    return NextResponse.json({ success: false, error: `Failed to read mockups: ${String(err)}` }, { status: 500 });
  }
}
