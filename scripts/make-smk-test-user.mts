// @ts-nocheck
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  const smkn15 = await prisma.school.findFirst({ where: { name: "SMKN 15 Jakarta" } });
  if (!smkn15) throw new Error("SMKN 15 tidak ditemukan");
  const pw = await bcrypt.hash("ui123456", 12);
  const smk = await prisma.user.upsert({
    where: { email: "smk.sim@edulalin.test" },
    update: {},
    create: {
      email: "smk.sim@edulalin.test",
      name: "Murid SMK SIM",
      passwordHash: pw,
      role: "MURID",
      educationLevel: "SMK",
      birthDate: new Date("2000-01-01"),
      schoolId: smkn15.id,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  console.log("Murid SMK:", smk.id, smk.email);
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});