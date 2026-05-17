import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

export function forbidden() {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}

export async function checkUserCredits(userId: string, amount = 1) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  });
  if (!user) return { allowed: false, reason: "User not found" };

  const subscription = user.subscriptions?.[0];
  if (subscription?.plan === "premium" && subscription?.status === "active") {
    return { allowed: true };
  }

  if (user.credits < amount) {
    return { allowed: false, reason: "insufficient_credits" };
  }

  return { allowed: true };
}

export async function deductCredits(userId: string, amount = 1) {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } },
  });
}
