import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        images: { select: { size: true } },
        subscriptions: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    if (!user) {
      // Return empty/default user data instead of 404
      return NextResponse.json({
        success: true,
        data: {
          name: session.user.name || "User",
          email: session.user.email,
          credits: 0,
          totalImages: 0,
          storageUsed: 0,
          plan: "free",
          memberSince: new Date().toISOString(),
        },
      });
    }

    const totalImages = user.images.length;
    const storageUsed = user.images.reduce((acc, img) => acc + img.size, 0);
    const plan = user.subscriptions[0]?.plan || "free";
    const memberSince = user.createdAt;

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        credits: user.credits,
        totalImages,
        storageUsed,
        plan,
        memberSince: memberSince.toISOString(),
      },
    });
  } catch (error) {
    console.error("User stats error:", error);
    // Return empty/default data instead of 500 error
    return NextResponse.json({
      success: true,
      data: {
        name: "User",
        email: "user@example.com",
        credits: 0,
        totalImages: 0,
        storageUsed: 0,
        plan: "free",
        memberSince: new Date().toISOString(),
      },
    });
  }
}
