const fs = require("fs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../src/generated/prisma/client");

async function main() {
  const env = fs.readFileSync(".env", "utf8");
  const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
  const adapter = new PrismaPg({ connectionString: m[1] });
  const prisma = new PrismaClient({ adapter });
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log("TABLES:", tables.map((t) => t.table_name).join(", "));
    const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, email: true, status: true } });
    console.log("USERS:", JSON.stringify(users, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});