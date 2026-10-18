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
  const users = await prisma.user.findMany({
    where: { role: "MURID", status: "ACTIVE" },
    select: {
      email: true,
      name: true,
      educationLevel: true,
      birthDate: true,
      school: { select: { name: true, educationLevel: true } },
    },
  });
  const today = new Date();
  users.forEach((u) => {
    let age = null;
    if (u.birthDate) {
      age = today.getFullYear() - u.birthDate.getFullYear();
      const bd = new Date(today.getFullYear(), u.birthDate.getMonth(), u.birthDate.getDate());
      if (bd > today) age--;
    }
    console.log(`${u.email} | ${u.name} | level=${u.educationLevel} | age=${age} | sekolah=${u.school?.name} (${u.school?.educationLevel})`);
  });
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});