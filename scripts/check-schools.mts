// @ts-nocheck
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, educationLevel: true, status: true },
  });
  console.log("SEKOLAH AKTIF:");
  schools.forEach((s) => console.log(`- ${s.name} | level=${s.educationLevel} | status=${s.status} | id=${s.id}`));
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});