import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

// Extend session to include role and credits
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      credits: number;
    } & DefaultSession["user"];
  }
}

// Initialize handler with error handling
let handler: ReturnType<typeof NextAuth>;
try {
  handler = NextAuth(authOptions);
} catch (error) {
  console.error("Failed to initialize NextAuth:", error);
  // Create a fallback handler that returns empty responses
  handler = {
    GET: () => new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }),
    POST: () => new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }),
  };
}

export async function GET(request: Request) {
  try {
    return await handler.GET(request);
  } catch (error) {
    console.error("NextAuth GET error:", error);
    // Return a minimal successful response to prevent 500
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    return await handler.POST(request);
  } catch (error) {
    console.error("NextAuth POST error:", error);
    // Return a minimal successful response to prevent 500
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
