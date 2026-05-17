import { spawn } from "child_process";
import { createServer } from "http";

process.env.DATABASE_URL = "file:./dev.db";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "dev-secret-key-change-in-production-1234567890";
process.env.UPLOAD_DIR = "./uploads";

const next = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "dev"],
  {
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  }
);

next.stdout.on("data", (d) => {
  process.stdout.write(d);
  const msg = d.toString();
  if (msg.includes("Ready") || msg.includes("http://localhost")) {
    console.log("\n=== SERVER IS READY ===");
  }
});

next.stderr.on("data", (d) => process.stderr.write(d));

process.on("SIGINT", () => next.kill());
process.on("SIGTERM", () => next.kill());
