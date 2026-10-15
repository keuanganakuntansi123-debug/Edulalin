import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");

const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

try {
  const col: { column_name: string }[] = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='User' AND column_name='embeddedAvatar'`
  );
  if (col.length === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN "embeddedAvatar" TEXT`
    );
    console.log("OK: kolom embeddedAvatar ditambahkan");
  } else {
    console.log("SKIP: kolom embeddedAvatar sudah ada");
  }
} finally {
  await prisma.$disconnect();
}