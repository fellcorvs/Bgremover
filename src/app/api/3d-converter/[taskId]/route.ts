import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MESHY_API_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const TASK_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

type MeshyTask = {
  status?: string;
  progress?: number;
  model_urls?: { glb?: string };
  thumbnail_url?: string;
  task_error?: { message?: string } | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Image-to-3D is not configured." },
      { status: 503 },
    );
  }
  if (!TASK_ID_PATTERN.test(params.taskId)) {
    return NextResponse.json({ success: false, error: "Invalid conversion task." }, { status: 400 });
  }

  try {
    const response = await fetch(`${MESHY_API_URL}/${params.taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const task = await response.json().catch(() => null) as MeshyTask | null;
    if (!response.ok || !task) {
      return NextResponse.json(
        { success: false, error: `Unable to read Meshy task (${response.status}).` },
        { status: response.status || 502 },
      );
    }

    return NextResponse.json({
      success: true,
      status: task.status || "PENDING",
      progress: Math.max(0, Math.min(100, task.progress || 0)),
      ready: task.status === "SUCCEEDED" && Boolean(task.model_urls?.glb),
      modelEndpoint: task.status === "SUCCEEDED" && task.model_urls?.glb
        ? `/api/3d-converter/${params.taskId}/model`
        : null,
      thumbnailUrl: task.thumbnail_url || null,
      error: task.task_error?.message || null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to read conversion progress." },
      { status: 500 },
    );
  }
}
