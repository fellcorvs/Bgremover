const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, credits: true }
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
  
  const images = await prisma.image.count();
  console.log('Total images:', images);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
