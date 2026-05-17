import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await hash("Admin123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bgremover.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@bgremover.com",
      passwordHash: adminPassword,
      role: "admin",
      credits: 999999,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      plan: "premium",
      status: "active",
    },
  });

  console.log(`Admin created: admin@bgremover.com / Admin123!`);

  const demoPassword = await hash("Demo1234!", 12);
  const demo = await prisma.user.upsert({
    where: { email: "demo@bgremover.com" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@bgremover.com",
      passwordHash: demoPassword,
      credits: 10,
    },
  });

  await prisma.subscription.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      plan: "free",
      status: "active",
    },
  });

  console.log(`Demo user created: demo@bgremover.com / Demo1234!`);
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
