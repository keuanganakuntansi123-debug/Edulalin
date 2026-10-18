// @ts-nocheck
// Simulasi alur murid tanpa mengubah data — verifikasi kuis & modul mana yang
// akan muncul untuk setiap murid berdasarkan scope sekolah+jenjang.
// Jalankan: npx tsx scripts/simulate-murid.mts
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { levelDisplayLabel } from "../src/lib/constants.ts";

const env = fs.readFileSync(".env", "utf8");
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

const printStudent = async (u: { id: string; name: string; schoolId: string | null; educationLevel: string | null }) => {
  const school = u.schoolId ? await prisma.school.findUnique({ where: { id: u.schoolId } }) : null;
  console.log(`\n===== MURID: ${u.name} =====`);
  console.log(`Sekolah: ${school?.name ?? "-"} (${school?.educationLevel ?? "-"}) | Jenjang akun: ${u.educationLevel ?? "-"}`);

  const quizzes = await prisma.quiz.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        {
          schoolId: null,
          quizToSchools: { none: {} },
          ...(u.educationLevel === "SMA"
            ? { educationLevel: { in: ["SMA", "SIM"] } }
            : u.educationLevel === "SMK"
              ? { educationLevel: { in: ["SMK", "SIM"] } }
              : { educationLevel: u.educationLevel ?? undefined }),
        },
        ...(u.schoolId ? [{ schoolId: u.schoolId }] : []),
        ...(u.schoolId
          ? [{ quizToSchools: { some: { schoolId: u.schoolId } } }]
          : []),
      ],
    },
    include: {
      quizToSchools: { select: { schoolId: true } },
      _count: { select: { questions: true } },
      attempts: { where: { userId: u.id, status: "COMPLETED" } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Kuis terlihat: ${quizzes.length}`);
  for (const q of quizzes) {
    const targets = q.quizToSchools.map((t) => t.schoolId);
    const targetLevels = targets.map((id) => (id === u.schoolId ? school?.educationLevel : "?"));
    console.log(`- [${q.educationLevel}] ${q.title} | target sekolah: ${targets.length} | jenjang sekolah: ${targetLevels.join(",")} | soal: ${q._count.questions} | completed: ${q.attempts.length}`);
  }

  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
    },
    include: { moduleToSchools: { select: { schoolId: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  const visibleModules = modules.filter((mo) => {
    const targets = mo.moduleToSchools.map((s) => s.schoolId);
    const isSchoolOwned = mo.schoolId != null;
    const isTargeted = !isSchoolOwned && targets.length > 0;
    const isGlobal = !isSchoolOwned && targets.length === 0;
    if (isSchoolOwned) return mo.schoolId === u.schoolId;
    if (isTargeted) return u.schoolId != null && targets.includes(u.schoolId);
    if (isGlobal) {
      if (mo.educationLevel === "SIM") return u.educationLevel === "SMA" || u.educationLevel === "SMK";
      return mo.educationLevel === u.educationLevel;
    }
    return false;
  });
  console.log(`Modul terlihat: ${visibleModules.length}`);
  for (const mo of visibleModules) {
    console.log(`- [${mo.educationLevel}] ${mo.title} | target: ${mo.moduleToSchools.length} sekolah | jenjang sekolah: ${mo.moduleToSchools.map((s) => (s.schoolId === u.schoolId ? school?.educationLevel : "?")).join(",")}`);
  }
};

const main = async () => {
  const murids = await prisma.user.findMany({
    where: { role: "MURID", deletedAt: null },
    select: { id: true, name: true, schoolId: true, educationLevel: true },
    orderBy: { name: "asc" },
  });
  for (const u of murids) await printStudent(u);
  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
