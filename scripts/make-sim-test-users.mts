// @ts-nocheck
// Buat murid uji temporer untuk verifikasi lock usia SIM (<17).
// DEWASA-16-2026@edulalin.test → lahir 2016 (usia ~9, tapi kunci: age < 17)
// Ganti pendekatan: langsung cek canAccessSim via usia.
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
  const sma90 = await prisma.school.findFirst({ where: { name: "SMA 90" } });
  if (!sma90) throw new Error("SMA 90 tidak ditemukan");
  const pw = await bcrypt.hash("ui123456", 12);
  // Murid usia 16 (lahir 2009-05-05 → 2026 May: usia 17? hitung manual: 26-9=17)
  // Agar pasti <17 pada tahun berjalan 2026, lahir 2012 → usia 14.
  const young = await prisma.user.upsert({
    where: { email: "young.sim@edulalin.test" },
    update: {},
    create: {
      email: "young.sim@edulalin.test",
      name: "Murid Muda SIM",
      passwordHash: pw,
      role: "MURID",
      educationLevel: "SMA",
      birthDate: new Date("2012-06-01"),
      schoolId: sma90.id,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  console.log("Murid muda:", young.id, young.email);

  const adult = await prisma.user.upsert({
    where: { email: "adult.sim@edulalin.test" },
    update: {},
    create: {
      email: "adult.sim@edulalin.test",
      name: "Murid Dewasa SIM",
      passwordHash: pw,
      role: "MURID",
      educationLevel: "SMA",
      birthDate: new Date("2000-01-01"),
      schoolId: sma90.id,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  console.log("Murid dewasa:", adult.id, adult.email);
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});