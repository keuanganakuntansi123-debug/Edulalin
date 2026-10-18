// @ts-nocheck
// Skrip audit data EDULALIN — verifikasi sinkronisasi relasi di Neon.
// Menampilkan ringkasan sekolah, murid, guru, modul, kuis, dan kesenjangan scope.
// Jalankan: npx tsx scripts/audit-data.mts
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const fmt = (n: number) => n.toLocaleString("id-ID");

const main = async () => {
  const [schools, users, modules, quizzes, attempts, uploads] = await Promise.all([
    prisma.school.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, schoolId: true, educationLevel: true, classLevel: true, major: true, status: true, deletedAt: true },
    }),
    prisma.module.findMany({
      where: { deletedAt: null },
      include: { moduleToSchools: { select: { schoolId: true } }, _count: { select: { progresses: true } } },
    }),
    prisma.quiz.findMany({
      where: { deletedAt: null },
      include: { quizToSchools: { select: { schoolId: true } }, _count: { select: { questions: true, attempts: true } } },
    }),
    prisma.quizAttempt.findMany({ select: { id: true, userId: true, quizId: true, status: true, passed: true, score: true, submittedAt: true } }),
    prisma.uploadedFile.findMany({ select: { id: true, kind: true, storedName: true } }),
  ]);

  console.log("=== RINGKASAN ===");
  console.log(`Sekolah: ${schools.length} | User: ${users.length} | Modul: ${modules.length} | Kuis: ${quizzes.length} | Attempt: ${attempts.length} | UploadedFile: ${uploads.length}`);

  const byRole = (r: string) => users.filter((u) => u.role === r && !u.deletedAt);
  console.log(`\n=== PENGGUNA AKTIF ===`);
  console.log(`ADMIN: ${byRole("ADMIN").length} | GURU: ${byRole("GURU").length} | POLISI: ${byRole("POLISI").length} | MURID: ${byRole("MURID").length}`);

  console.log(`\n=== SEKOLAH ===`);
  for (const s of schools) {
    const murid = users.filter((u) => u.schoolId === s.id && u.role === "MURID" && !u.deletedAt);
    console.log(`- ${s.name} [${s.educationLevel}] status=${s.status} (${murid.length} murid, costs ${s._count.users} user)`);
    const lev = murid.map((x) => x.educationLevel);
    const uniqLev = [...new Set(lev)];
    if (uniqLev.length > 1) console.log(`   ⚠️ murid jenjang campuran di sekolah: ${uniqLev.join(", ")}`);
    const tanpaSekolah = murid.filter((x) => !x.educationLevel);
    if (tanpaSekolah.length > 0) console.log(`   ⚠️ ${tanpaSekolah.length} murid tanpa jenjang`);
    const smkSalah = murid.filter((x) => (s.educationLevel === "SMK" ? x.educationLevel !== "SMK" : x.educationLevel !== s.educationLevel));
    if (smkSalah.length > 0) console.log(`   ⚠️ ${smkSalah.length} murid jenjang tidak cocok sekolah: ${smkSalah.map((x) => `${x.name}(${x.educationLevel})`).join(", ")}`);
  }

  console.log(`\n=== MURID TANPA SEKOLAH/JENJANG ===`);
  const murid = byRole("MURID");
  const noSchool = murid.filter((u) => !u.schoolId);
  const noLevel = murid.filter((u) => !u.educationLevel);
  if (noSchool.length) console.log(`⚠️ ${noSchool.length} murid tanpa schoolId: ${noSchool.map((u) => u.name).join(", ")}`);
  if (noLevel.length) console.log(`⚠️ ${noLevel.length} murid tanpa educationLevel: ${noLevel.map((u) => u.name).join(", ")}`);

  console.log(`\n=== MODUL (${modules.length}) ===`);
  const modGlobal = modules.filter((x) => x.schoolId == null && x.moduleToSchools.length === 0);
  const modTarge = modules.filter((x) => x.schoolId == null && x.moduleToSchools.length > 0);
  const modSekolah = modules.filter((x) => x.schoolId != null);
  console.log(`Global: ${modGlobal.length} | Target sekolah: ${modTarge.length} | Milik sekolah: ${modSekolah.length}`);
  const orphanTarget = modTarge.filter((x) => {
    const ids = x.moduleToSchools.map((s) => s.schoolId);
    return !schools.some((s) => ids.includes(s.id));
  });
  if (orphanTarget.length) console.log(`⚠️ ${orphanTarget.length} modul menarget sekolah tidak ada: ${orphanTarget.map((x) => x.title).join(", ")}`);
  if (modules.length === 0) console.log("Belum ada modul sama sekali.");

  console.log(`\n=== KUIS (${quizzes.length}) ===`);
  const qGlobal = quizzes.filter((x) => x.schoolId == null && x.quizToSchools.length === 0);
  const qTarge = quizzes.filter((x) => x.schoolId == null && x.quizToSchools.length > 0);
  const qSekolah = quizzes.filter((x) => x.schoolId != null);
  const qDraft = quizzes.filter((x) => x.status === "DRAFT");
  const qActive = quizzes.filter((x) => x.status === "ACTIVE");
  console.log(`Global: ${qGlobal.length} | Target sekolah: ${qTarge.length} | Milik sekolah: ${qSekolah.length} | ACTIVE: ${qActive.length} | DRAFT: ${qDraft.length}`);
  const orphanQuizTarget = qTarge.filter((x) => {
    const ids = x.quizToSchools.map((s) => s.schoolId);
    return !schools.some((s) => ids.includes(s.id));
  });
  if (orphanQuizTarget.length) console.log(`⚠️ ${orphanQuizTarget.length} kuis menarget sekolah tidak ada: ${orphanQuizTarget.map((x) => x.title).join(", ")}`);
  if (quizzes.length === 0) console.log("Belum ada kuis sama sekali.");
  else {
    console.log("\nDaftar kuis:");
    for (const q of quizzes) {
      const schoolNames = q.quizToSchools.length
        ? q.quizToSchools.map((t) => schools.find((s) => s.id === t.schoolId)?.name ?? "?")
        : q.schoolId
          ? [schools.find((s) => s.id === q.schoolId)?.name ?? "?"]
          : ["GLOBAL"];
      console.log(`- [${q.status}] ${q.title} (${q.educationLevel}) -> ${schoolNames.join(", ")} | soal=${q._count.questions} attempt=${q._count.attempts}`);
    }
  }

  console.log(`\n=== ATTEMPT (${attempts.length}) ===`);
  const completed = attempts.filter((a) => a.status === "COMPLETED");
  const passedCt = completed.filter((a) => a.passed).length;
  const avg = completed.length ? Math.round(completed.reduce((a, x) => a + (x.score ?? 0), 0) / completed.length) : 0;
  console.log(`Completed: ${completed.length} | Lulus: ${passedCt} | Rata-rata: ${avg}`);
  const perRole: Record<string, number> = {};
  for (const a of attempts) {
    const u = users.find((x) => x.id === a.userId);
    perRole[u?.role ?? "?"] = (perRole[u?.role ?? "?"] ?? 0) + 1;
  }
  console.log("Attempt per role:", JSON.stringify(perRole));

  console.log(`\n=== FILE (${uploads.length}) ===`);
  const byKind: Record<string, number> = {};
  for (const f of uploads) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
  console.log(JSON.stringify(byKind));
  const logoCount = uploads.filter((f) => f.kind === "SCHOOL_LOGO").length;
  console.log(`Logo sekolah terunggah: ${logoCount}`);

  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
