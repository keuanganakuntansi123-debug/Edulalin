// @ts-nocheck
// Normalisasi data EDULALIN — samakan jenjang kuis/modul dengan jenjang
// sekolah tujuan agar data tersinkronisasi berdasarkan ID sekolah.
// Hanya mengubah metadata jenjang (TIDAK menghapus data), aman dijalankan ulang.
// Jalankan: npx tsx scripts/normalize-levels.mts
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const normalizeEnum = (v) =>
  ["SD", "SMP", "SMA", "SMK", "SIM"].includes(v) ? v : null;

async function normalizeQuizzes() {
  const quizzes = await prisma.quiz.findMany({
    where: { deletedAt: null },
    include: { quizToSchools: { include: { school: true } } },
  });
  let updated = 0;
  for (const q of quizzes) {
    const targets = q.quizToSchools.map((t) => t.school);
    if (q.schoolId != null) {
      const school = await prisma.school.findUnique({ where: { id: q.schoolId } });
      if (school && school.educationLevel !== q.educationLevel && q.educationLevel !== "SIM") {
        console.log(`Kuis "${q.title}": schoolId sekolah jenjang ${school.educationLevel} != ${q.educationLevel} → perbaiki`);
        await prisma.quiz.update({ where: { id: q.id }, data: { educationLevel: school.educationLevel } });
        updated++;
      }
    } else if (targets.length > 0) {
      const levels = [...new Set(targets.map((s) => s.educationLevel))];
      if (levels.length === 1 && levels[0] !== q.educationLevel && q.educationLevel !== "SIM") {
        console.log(`Kuis "${q.title}": target ${levels[0]} != ${q.educationLevel} → perbaiki`);
        await prisma.quiz.update({ where: { id: q.id }, data: { educationLevel: levels[0] } });
        updated++;
      } else if (levels.length > 1) {
        console.log(`Kuis "${q.title}" target campuran (${levels.join(",")}) — biarkan jenjang manual.`);
      }
    }
  }
  return updated;
}

async function normalizeModules() {
  const modules = await prisma.module.findMany({
    where: { deletedAt: null },
    include: { moduleToSchools: { include: { school: true } } },
  });
  let updated = 0;
  for (const mod of modules) {
    const targets = mod.moduleToSchools.map((t) => t.school);
    if (mod.schoolId != null) {
      const school = await prisma.school.findUnique({ where: { id: mod.schoolId } });
      if (school && school.educationLevel !== mod.educationLevel && mod.educationLevel !== "SIM") {
        console.log(`Modul "${mod.title}": schoolId sekolah jenjang ${school.educationLevel} != ${mod.educationLevel} → perbaiki`);
        await prisma.module.update({ where: { id: mod.id }, data: { educationLevel: school.educationLevel } });
        updated++;
      }
    } else if (targets.length > 0) {
      const levels = [...new Set(targets.map((s) => s.educationLevel))];
      if (levels.length === 1 && levels[0] !== mod.educationLevel && mod.educationLevel !== "SIM") {
        console.log(`Modul "${mod.title}": target ${levels[0]} != ${mod.educationLevel} → perbaiki`);
        await prisma.module.update({ where: { id: mod.id }, data: { educationLevel: levels[0] } });
        updated++;
      } else if (levels.length > 1) {
        console.log(`Modul "${mod.title}" target campuran (${levels.join(",")}) — biarkan jenjang manual.`);
      }
    }
  }
  return updated;
}

const main = async () => {
  console.log("=== NORMALISASI JENJANG KUIS & MODUL ===");
  const q = await normalizeQuizzes();
  const mo = await normalizeModules();
  console.log(`\nSelesai. Kuis diperbaiki: ${q} | Modul diperbaiki: ${mo}`);
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
