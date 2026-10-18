// @ts-nocheck
// Perbaikan kategori modul/kuis EDULALIN — menyelaraskan jenjang dengan
// sekolah tujuan tanpa menghapus data. Aman dijalankan ulang.
//
// Cakupan:
// 1. Modul/kuis yang memakai schoolId: jenjang disamakan dgn sekolah.
// 2. Modul/kuis dengan target (ModuleToSchool/QuizToSchool):
//    - semua target seragam -> jenjang disamakan dengan target.
//    - target campuran / salah jenjang -> hanya sekolah yang cocok
//      dengan jenjang konten yang dipertahankan (target lain dihapus
//      dari tabel relasi, data konten TIDAK dihapus).
// 3. Modul/kuis SIM: sekolah tujuan non-SMA/SMK dihapus dari relasi.
//
// Jalankan: npx tsx scripts/fix-categories.mts
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

async function fixModules() {
  let updated = 0;
  let detached = 0;
  const modules = await prisma.module.findMany({
    where: { deletedAt: null },
    include: { moduleToSchools: { include: { school: true } } },
  });
  for (const mod of modules) {
    const targets = mod.moduleToSchools.map((t) => t.school);

    // 1. Modul milik sekolah tertentu (schoolId)
    if (mod.schoolId != null) {
      const school = await prisma.school.findUnique({ where: { id: mod.schoolId } });
      if (school && school.educationLevel !== mod.educationLevel) {
        if (mod.educationLevel === "SIM") {
          if (school.educationLevel !== "SMA" && school.educationLevel !== "SMK") {
            console.log(
              `MODUL SIM "${mod.title}" -> sekolah ${school.name} (${school.educationLevel}) TIDAK sesuai; samakan ke SMA.`
            );
            await prisma.module.update({ where: { id: mod.id }, data: { educationLevel: "SMA" } });
            updated++;
          }
        } else {
          console.log(
            `MODUL "${mod.title}": schoolId jenjang ${school.educationLevel} != ${mod.educationLevel} -> perbaiki`
          );
          await prisma.module.update({
            where: { id: mod.id },
            data: { educationLevel: school.educationLevel },
          });
          updated++;
        }
      }
      continue;
    }

    // 2. Modul global dengan target sekolah (moduleToSchools)
    if (targets.length > 0) {
      const levels = [...new Set(targets.map((s) => s.educationLevel))];

      if (mod.educationLevel === "SIM") {
        const bad = targets.filter(
          (s) => s.educationLevel !== "SMA" && s.educationLevel !== "SMK"
        );
        if (bad.length) {
          console.log(
            `MODUL SIM "${mod.title}": lepas ${bad.length} target non-SMA/SMK (${bad.map((s) => s.name).join(", ")})`
          );
          await prisma.moduleToSchool.deleteMany({
            where: { moduleId: mod.id, schoolId: { in: bad.map((s) => s.id) } },
          });
          detached += bad.length;
        }
        continue;
      }

      if (levels.length === 1 && levels[0] !== mod.educationLevel) {
        console.log(
          `MODUL "${mod.title}": target ${levels[0]} != ${mod.educationLevel} -> perbaiki`
        );
        await prisma.module.update({
          where: { id: mod.id },
          data: { educationLevel: levels[0] },
        });
        updated++;
      } else if (levels.length > 1) {
        const bad = targets.filter((s) => s.educationLevel !== mod.educationLevel);
        if (bad.length) {
          console.log(
            `MODUL "${mod.title}" target campuran: lepas ${bad.length} target tidak sesuai jenjang ${mod.educationLevel}`
          );
          await prisma.moduleToSchool.deleteMany({
            where: { moduleId: mod.id, schoolId: { in: bad.map((s) => s.id) } },
          });
          detached += bad.length;
        }
      }
    }
  }
  return { updated, detached };
}

async function fixQuizzes() {
  let updated = 0;
  let detached = 0;
  const quizzes = await prisma.quiz.findMany({
    where: { deletedAt: null },
    include: { quizToSchools: { include: { school: true } } },
  });
  for (const quiz of quizzes) {
    const targets = quiz.quizToSchools.map((t) => t.school);

    // 1. Kuis milik sekolah tertentu (schoolId)
    if (quiz.schoolId != null) {
      const school = await prisma.school.findUnique({ where: { id: quiz.schoolId } });
      if (school && school.educationLevel !== quiz.educationLevel) {
        if (quiz.educationLevel === "SIM") {
          if (school.educationLevel !== "SMA" && school.educationLevel !== "SMK") {
            await prisma.quiz.update({ where: { id: quiz.id }, data: { educationLevel: "SMA" } });
            updated++;
          }
        } else {
          console.log(
            `KUIS "${quiz.title}": schoolId jenjang ${school.educationLevel} != ${quiz.educationLevel} -> perbaiki`
          );
          await prisma.quiz.update({
            where: { id: quiz.id },
            data: { educationLevel: school.educationLevel },
          });
          updated++;
        }
      }
      continue;
    }

    // 2. Kuis global dengan target sekolah (quizToSchools)
    if (targets.length > 0) {
      const levels = [...new Set(targets.map((s) => s.educationLevel))];

      if (quiz.educationLevel === "SIM") {
        const bad = targets.filter(
          (s) => s.educationLevel !== "SMA" && s.educationLevel !== "SMK"
        );
        if (bad.length) {
          console.log(
            `KUIS SIM "${quiz.title}": lepas ${bad.length} target non-SMA/SMK (${bad.map((s) => s.name).join(", ")})`
          );
          await prisma.quizToSchool.deleteMany({
            where: { quizId: quiz.id, schoolId: { in: bad.map((s) => s.id) } },
          });
          detached += bad.length;
        }
        continue;
      }

      if (levels.length === 1 && levels[0] !== quiz.educationLevel) {
        console.log(
          `KUIS "${quiz.title}": target ${levels[0]} != ${quiz.educationLevel} -> perbaiki`
        );
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: { educationLevel: levels[0] },
        });
        updated++;
      } else if (levels.length > 1) {
        const bad = targets.filter((s) => s.educationLevel !== quiz.educationLevel);
        if (bad.length) {
          console.log(
            `KUIS "${quiz.title}" target campuran: lepas ${bad.length} target tidak sesuai jenjang ${quiz.educationLevel}`
          );
          await prisma.quizToSchool.deleteMany({
            where: { quizId: quiz.id, schoolId: { in: bad.map((s) => s.id) } },
          });
          detached += bad.length;
        }
      }
    }
  }
  return { updated, detached };
}

const main = async () => {
  console.log("=== PERBAIKAN KATEGORI MODUL & KUIS ===");
  const mo = await fixModules();
  console.log(
    `MODULE: ${mo.updated} jenjang diperbaiki, ${mo.detached} target tidak sesuai dilepas`
  );
  const q = await fixQuizzes();
  console.log(
    `KUIS: ${q.updated} jenjang diperbaiki, ${q.detached} target tidak sesuai dilepas`
  );
  console.log("\nSelesai. Data konten TIDAK dihapus — hanya relasi salah dibetulkan.");
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});