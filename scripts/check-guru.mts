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
  const gurus = await prisma.user.findMany({
    where: { role: "GURU", deletedAt: null },
    select: {
      email: true,
      name: true,
      educationLevel: true,
      subject: true,
      status: true,
      school: { select: { name: true, educationLevel: true } },
    },
  });
  gurus.forEach((g) => console.log(`${g.email} | ${g.name} | level=${g.educationLevel} | subjek=${g.subject} | status=${g.status} | sekolah=${g.school?.name} (${g.school?.educationLevel})`));
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});