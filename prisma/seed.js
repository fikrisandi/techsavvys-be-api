const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "m.fikrisandi.p@gmail.com" },
    update: {},
    create: {
      name: "Muhammad Fikri Sandi Pratama",
      email: "m.fikrisandi.p@gmail.com",
      password: hashedPassword,
    },
  });

  console.log("Admin seeded:", admin.email);
  console.log("Default password: admin123 (GANTI SEGERA!)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
