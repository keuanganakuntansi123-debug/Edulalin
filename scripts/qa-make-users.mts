// @ts-nocheck
// TEMPORER: buat akun QA GURU & POLISI untuk verifikasi UI/UX.
// Dihapus kembali setelah pengujian selesai.
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
  const school = await prisma.school.findFirst({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  if (!school) throw new Error("Tidak ada sekolah di DB");
  console.log("Sekolah QA:", school.name, `(${school.educationLevel ?? "-"})`);
  const pw = await bcrypt.hash("qa123456", 12);

  const users = [
    { email: "qa.guru@edulalin.test", name: "QA Guru", role: "GURU" },
    { email: "qa.polisi@edulalin.test", name: "QA Polisi", role: "POLISI" },
    { email: "qa.admin@edulalin.test", name: "QA Admin", role: "ADMIN" },
  ];

  for (const u of users) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: pw, status: "ACTIVE", deletedAt: null },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: pw,
        role: u.role,
        schoolId: u.role === "POLISI" ? null : school.id,
        educationLevel: u.role === "MURID" ? "SMA" : null,
        policeLevel: u.role === "POLISI" ? "POLRES" : null,
        policeUnit: u.role === "POLISI" ? "Polres Kota" : null,
        status: "ACTIVE",
        verifiedAt: new Date(),
      },
    });
    console.log(`OK ${row.role.padEnd(7)} ${row.email}`);
  }

  const murid = await prisma.user.findFirst({
    where: { role: "MURID", deletedAt: null },
    select: { email: true, name: true },
  });
  console.log("Murid eksisting:", murid?.email ?? "(tidak ada)");

  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
