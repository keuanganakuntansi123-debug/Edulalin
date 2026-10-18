// @ts-nocheck
// Periksa mapping kuis & modul -> sekolah tujuan (data asli Neon).
// Jalankan: npx tsx scripts/check-targets.mts
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const main = async () => {
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  console.log("=== SEKOLAH ===");
  for (const s of schools) console.log(`- ${s.id} | ${s.name} | ${s.educationLevel} | ${s.status}`);

  console.log("\n=== KUIS & TARGET ===");
  const quizzes = await prisma.quiz.findMany({
    where: { deletedAt: null },
    include: { quizToSchools: { include: { school: true } } },
  });
  for (const q of quizzes) {
    console.log(`- [${q.educationLevel}] ${q.title} | status=${q.status} | schoolId=${q.schoolId ?? "null"}`);
    for (const t of q.quizToSchools) {
      console.log(`   -> ${t.schoolId} = ${t.school?.name} (${t.school?.educationLevel})`);
    }
  }

  console.log("\n=== MODUL & TARGET ===");
  const modules = await prisma.module.findMany({
    where: { deletedAt: null },
    include: { moduleToSchools: { include: { school: true } } },
  });
  for (const mo of modules) {
    console.log(`- [${mo.educationLevel}] ${mo.title} | status=${mo.status} | schoolId=${mo.schoolId ?? "null"} | thumbnail=${mo.thumbnailFileId ? "YA" : mo.thumbnailUrl ?? "TIDAK"}`);
    for (const t of mo.moduleToSchools) {
      console.log(`   -> ${t.schoolId} = ${t.school?.name} (${t.school?.educationLevel})`);
    }
  }

  console.log("\n=== ATTEMPT ===");
  const attempts = await prisma.quizAttempt.findMany({
    include: { user: { select: { name: true, role: true } }, quiz: { select: { title: true } } },
    orderBy: { startedAt: "desc" },
  });
  for (const a of attempts) {
    console.log(`- ${a.user.name} (${a.user.role}) | ${a.quiz.title} | ${a.status} | score=${a.score ?? "-"} | started=${a.startedAt.toISOString()}`);
  }

  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
