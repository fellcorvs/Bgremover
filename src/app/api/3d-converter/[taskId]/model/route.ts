import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MESHY_API_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const TASK_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "Image-to-3D is not configured." }, { status: 503 });
  }
  if (!TASK_ID_PATTERN.test(params.taskId)) {
    return NextResponse.json({ success: false, error: "Invalid conversion task." }, { status: 400 });
  }

  try {
    const taskResponse = await fetch(`${MESHY_API_URL}/${params.taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const task = await taskResponse.json().catch(() => null) as {
      status?: string;
      model_urls?: { glb?: string };
    } | null;
    const modelUrl = task?.status === "SUCCEEDED" ? task.model_urls?.glb : null;
    if (!taskResponse.ok || !modelUrl) {
      return NextResponse.json({ success: false, error: "The converted GLB is not ready." }, { status: 409 });
    }

    // Send the browser to Meshy's signed asset URL so large textured GLBs do
    // not pass through Vercel Functions' 4.5 MB response payload limit.
    return NextResponse.redirect(modelUrl, 307);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to download the converted GLB." },
      { status: 500 },
    );
  }
}
