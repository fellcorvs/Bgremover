import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MESHY_API_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
// Keep multipart requests below Vercel Functions' 4.5 MB payload limit.
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

function getApiKey() {
  return process.env.MESHY_API_KEY?.trim();
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Image-to-3D is not configured. Add MESHY_API_KEY to the server environment.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Choose an image to convert." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Meshy image-to-3D supports PNG and JPEG images." },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: "The source image must be between 1 byte and 4 MB." },
        { status: 400 },
      );
    }

    const imageData = Buffer.from(await file.arrayBuffer()).toString("base64");
    const response = await fetch(MESHY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: `data:${file.type};base64,${imageData}`,
        model_type: "standard",
        ai_model: "latest",
        should_texture: true,
        enable_pbr: true,
        hd_texture: true,
        target_formats: ["glb"],
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null) as { result?: string; message?: string } | null;
    if (!response.ok || !payload?.result) {
      const message = payload?.message || `Meshy rejected the conversion request (${response.status}).`;
      return NextResponse.json({ success: false, error: message }, { status: response.status || 502 });
    }

    return NextResponse.json({ success: true, taskId: payload.result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to start 3D conversion." },
      { status: 500 },
    );
  }
}
