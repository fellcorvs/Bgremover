import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";

export async function POST(req: NextRequest) {
  try {
    const { files } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    const chunks: Buffer[] = [];

    const stream = new (await import("stream")).PassThrough();

    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    for (const file of files) {
      try {
        const response = await fetch(file.url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const name = file.name.replace(/\.[^.]+$/, "") + "-bg-removed.png";
          archive.append(buffer, { name });
        }
      } catch {
        console.error(`Failed to fetch ${file.url}`);
      }
    }

    await archive.finalize();
    await archivePromise;

    const zipBuffer = Buffer.concat(chunks);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="bg-removed-images.zip"',
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create ZIP" },
      { status: 500 }
    );
  }
}
