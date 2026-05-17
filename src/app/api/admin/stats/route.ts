import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const [totalUsers, totalImages, processedImages, recentUploads] =
      await Promise.all([
        prisma.user.count(),
        prisma.image.count(),
        prisma.image.count({ where: { status: "completed" } }),
        prisma.image.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const formatDistribution = await prisma.image.groupBy({
      by: ["mimeType"],
      _count: true,
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyUploads = await prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM Image
      WHERE created_at >= ${sevenDaysAgo.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalImages,
        totalProcessed: processedImages,
        storageUsed: processedImages * 2, // MB estimate
        recentUploads,
        popularFormats: formatDistribution.map((f) => ({
          format: f.mimeType.split("/")[1] || f.mimeType,
          count: f._count,
        })),
        dailyUploads: dailyUploads.map((d) => ({
          date: d.date,
          count: Number(d.count),
        })),
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
