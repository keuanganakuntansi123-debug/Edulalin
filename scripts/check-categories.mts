// @ts-nocheck
// Verifikasi distribusi kategori modul/kuis per jenjang di Neon.
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  const [modules, quizzes, schools, students] = await Promise.all([
    prisma.module.findMany({ where: { deletedAt: null }, select: { educationLevel: true, title: true, schoolId: true, moduleToSchools: { select: { school: { select: { name: true, educationLevel: true } } } } } }),
    prisma.quiz.findMany({ where: { deletedAt: null }, select: { educationLevel: true, title: true, schoolId: true, quizToSchools: { select: { school: { select: { name: true, educationLevel: true } } } } } }),
    prisma.school.findMany({ select: { name: true, educationLevel: true } }),
    prisma.user.findMany({ where: { role: "MURID", deletedAt: null }, select: { educationLevel: true } }),
  ]);

  const count = (arr, key) =>
    arr.reduce((acc, x) => {
      const k = x[key] ?? "NULL";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  console.log("=== DISTRIBUSI JENJANG ===");
  console.log("SEKOLAH:", JSON.stringify(count(schools, "educationLevel"), null, 2));
  console.log("MURID  :", JSON.stringify(count(students, "educationLevel"), null, 2));
  console.log("MODUL  :", JSON.stringify(count(modules, "educationLevel"), null, 2));
  console.log("KUIS   :", JSON.stringify(count(quizzes, "educationLevel"), null, 2));

  console.log("\n=== MODUL DENGAN TARGET CAMPURAN / TIDAK SESUAI ===");
  for (const mod of modules) {
    if (mod.moduleToSchools.length === 0) continue;
    const levels = new Set(mod.moduleToSchools.map((t) => t.school.educationLevel));
    if (levels.size > 1 || !levels.has(mod.educationLevel)) {
      console.log(`- "${mod.title}" [${mod.educationLevel}] -> target ${[...levels].join(", ")}`);
    }
  }

  console.log("\n=== KUIS DENGAN TARGET CAMPURAN / TIDAK SESUAI ===");
  for (const q of quizzes) {
    if (q.quizToSchools.length === 0) continue;
    const levels = new Set(q.quizToSchools.map((t) => t.school.educationLevel));
    if (levels.size > 1 || !levels.has(q.educationLevel)) {
      console.log(`- "${q.title}" [${q.educationLevel}] -> target ${[...levels].join(", ")}`);
    }
  }

  console.log("\n=== DAFTAR MODUL (10) ===");
  modules.slice(0, 10).forEach((m) => {
    const targets = m.moduleToSchools.map((t) => `${t.school.name}(${t.school.educationLevel})`).join(", ");
    console.log(`- [${m.educationLevel}] ${m.title} ${targets ? "→ target: " + targets : ""}`);
  });

  console.log("\n=== DAFTAR KUIS (10) ===");
  quizzes.slice(0, 10).forEach((q) => {
    const targets = q.quizToSchools.map((t) => `${t.school.name}(${t.school.educationLevel})`).join(", ");
    console.log(`- [${q.educationLevel}] ${q.title} ${targets ? "→ target: " + targets : ""}`);
  });

  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});