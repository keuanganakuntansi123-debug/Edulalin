import { prisma } from "@/lib/prisma";
import {
  educationLevelMatch,
  getAge,
  simAllowedForLevel,
  validateSchoolLevelMatch,
} from "@/lib/constants";
import type { Role, EducationLevel } from "@/generated/prisma/client";

export type ModuleScope = {
  schoolId?: string | null;
  educationLevel: EducationLevel;
  classLevel?: string | null;
  birthDate?: Date | null;
};

const MODULE_INCLUDE = {
  moduleToSchools: { select: { schoolId: true } },
  thumbnailFile: { select: { storedName: true } },
} as const;

export type CategoryLevel = "SD" | "SMP" | "SMA" | "SMK" | "SIM";

/**
 * Validasi kategori vs sekolah tujuan (server-only).
 * - SIM adalah subtype: hanya boleh ditujukan ke sekolah SMA/SMK.
 * - Jenjang lain: setiap sekolah tujuan wajib jenjang sama dengan kategori.
 * Melakukan lookup sekolah sendiri dari daftar schoolIds.
 */
export async function validateCategorySchoolMatch(
  categoryLevel: string | null | undefined,
  schoolIds: string[]
): Promise<{ level: CategoryLevel; error: string | null }> {
  let level = String(categoryLevel ?? "").toUpperCase();
  if (!["SD", "SMP", "SMA", "SMK", "SIM"].includes(level)) level = "";

  if (schoolIds.length) {
    const schools = await prisma.school.findMany({
      where: { id: { in: schoolIds } },
      select: { educationLevel: true },
    });
    if (schools.length !== schoolIds.length) {
      return { level: (level || "SMA") as CategoryLevel, error: "Sekolah tujuan tidak valid" };
    }
    const schoolLevels = schools
      .map((s) => s.educationLevel)
      .filter((l): l is EducationLevel => l != null);

    if (level === "SIM") {
      const bad = schoolLevels.filter((l) => l !== "SMA" && l !== "SMK");
      if (bad.length) {
        return {
          level,
          error:
            "Materi SIM hanya dapat ditujukan ke sekolah SMA/SMK. Hapus sekolah jenjang lain dari tujuan.",
        };
      }
    } else if (["SD", "SMP", "SMA", "SMK"].includes(level)) {
      const err = validateSchoolLevelMatch(level, schoolLevels);
      if (err) return { level: level as CategoryLevel, error: err };
    }
  }

  return { level: (level || "SMA") as CategoryLevel, error: null };
}

/** Penanda modul SIM yang dibuka oleh murid. */
export type ModuleAccessFlag = {
  isSim: boolean;
  simLocked: boolean;
};

/** Daftar modul yang boleh dilihat murid sesuai scope sekolah + jenjang + kelas. */
export async function listModulesForMurid(scope: ModuleScope & { userId: string }) {
  const { schoolId, educationLevel, userId, birthDate } = scope;
  const simAllowed = canAccessSim(birthDate);
  const simVisible = simAllowedForLevel(educationLevel);
  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        // Kategori sendiri (SD/SMP/SMA/SMK) - ketat per jenjang
        ...(educationLevel ? [{ educationLevel }] : []),
        // SIM hanya untuk murid SMA/SMK (usia diperiksa terpisah)
        ...(simVisible ? [{ educationLevel: "SIM" as const }] : []),
      ],
    },
    include: MODULE_INCLUDE,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const visible = modules.filter((m) => {
    const targets = m.moduleToSchools.map((s) => s.schoolId);
    const isSchoolOwned = m.schoolId != null;
    const isTargeted = !isSchoolOwned && targets.length > 0;
    const isGlobal = !isSchoolOwned && targets.length === 0;

    // Kunci utama: jenjang konten harus cocok dengan jenjang murid
    // (SIM hanya untuk SMA/SMK). Ini mencegah kategori tercampur.
    const levelOk =
      m.educationLevel === educationLevel ||
      (m.educationLevel === "SIM" && simVisible);
    if (!levelOk) return false;

    // Modul milik sekolah tertentu: hanya murid sekolah itu.
    if (isSchoolOwned) return m.schoolId === schoolId;

    // Modul yang ditargetkan admin ke sekolah murid: hanya SEKOLAH dengan
    // jenjang yang cocok (levelOk sudah membatasi). ID sekolah tetap diverifikasi.
    if (isTargeted) return schoolId != null && targets.includes(schoolId);

    // Modul global: kecocokan jenjang (termasuk aturan SIM).
    if (isGlobal) {
      return educationLevelMatch(educationLevel, m.educationLevel);
    }
    return false;
  });

  // Tambahkan hitungan progress
  const withProgress = await Promise.all(
    visible.map(async (m) => {
      const [countProgress, userProgress] = await Promise.all([
        prisma.moduleProgress.count({ where: { moduleId: m.id } }),
        prisma.moduleProgress.findUnique({
          where: { moduleId_userId: { moduleId: m.id, userId } },
          select: { id: true, progress: true, completed: true },
        }),
      ]);
      return { ...m, _count: { progresses: countProgress }, progresses: userProgress ? [userProgress] : [] };
    })
  );

  // Tambahkan penanda SIM untuk frontend (lock vs terbuka).
  const flagged = withProgress.map((m) => ({
    ...m,
    isSim: m.educationLevel === "SIM",
    simLocked: m.educationLevel === "SIM" && !simAllowed,
  }));
  return flagged;
}

/** Daftar modul untuk GURU: modul global + modul sekolah tempat mengajar,
 * diffilter jenjang sekolah. SIM hanya tampil untuk sekolah SMA/SMK. */
export async function listModulesForGuru(params: {
  schoolId: string | null;
  educationLevel: EducationLevel | null;
}) {
  const { schoolId, educationLevel } = params;
  const allowedLevels: EducationLevel[] =
    educationLevel === "SMA"
      ? ["SMA", "SIM"]
      : educationLevel === "SMK"
        ? ["SMK", "SIM"]
      : educationLevel === "SD" || educationLevel === "SMP"
        ? [educationLevel]
        : ["SD", "SMP", "SMA", "SMK", "SIM"];
  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      AND: [
        { educationLevel: { in: allowedLevels } },
        {
          OR: [
            { schoolId: null, moduleToSchools: { none: {} } }, // global
            ...(schoolId
              ? [
                  { schoolId },
                  { moduleToSchools: { some: { schoolId } } },
                ]
              : []),
          ],
        },
      ],
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      thumbnailFile: { select: { storedName: true } },
      _count: { select: { progresses: true, quizzes: true } },
    },
  });
  return modules;
}

/** Daftar modul untuk POLISI: seluruh modul aktif semua sekolah (read-only). */
export async function listModulesForPolisi() {
  const modules = await prisma.module.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      thumbnailFile: { select: { storedName: true } },
      school: { select: { name: true, educationLevel: true } },
      _count: { select: { progresses: true, quizzes: true } },
    },
  });
  return modules;
}

/** Cek apakah murid dapat mengakses modul SIM (usia >= 17). */
export function canAccessSim(birthDate?: Date | null): boolean {
  if (!birthDate) return false;
  return getAge(birthDate) >= 17;
}

/** Ambil satu modul dengan verifikasi scope + aturan umur SIM. */
export async function getModuleForUser(params: {
  moduleId: string;
  user: {
    id: string;
    role: Role;
    schoolId: string | null;
    educationLevel: EducationLevel | null;
    birthDate: Date | null;
  };
}) {
  const { moduleId, user } = params;
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
    include: {
      moduleToSchools: { select: { schoolId: true } },
      contentFile: { select: { storedName: true, originalName: true, mimeType: true } },
      thumbnailFile: { select: { storedName: true } },
    },
  });
  if (!mod) return null;

  // ADMIN boleh semua
  if (user.role === "ADMIN") return mod;

  // School isolation
  const targetSchools = mod.moduleToSchools.map((s) => s.schoolId);
  const hasTargets = targetSchools.length > 0;
  const isSchoolOwned = mod.schoolId != null;
  const isTargeted = !isSchoolOwned && hasTargets;

  if (isSchoolOwned && mod.schoolId !== user.schoolId) return null;
  if (isTargeted && (!user.schoolId || !targetSchools.includes(user.schoolId))) return null;

  // Jenjang + aturan SIM untuk murid. Untuk modul yang ditarget sekolah,
  // jenjang tetap harus cocok — admin memilih sekolah tujuan yang sesuai kategori.
  if (user.role === "MURID" && user.educationLevel) {
    const isSimModule = mod.educationLevel === "SIM";
    if (isSimModule) {
      // Modul SIM tergabung dalam kategori SMA/SMK — hanya murid SMA/SMK.
      if (!simAllowedForLevel(user.educationLevel)) return null;
      // Murid di bawah 17 tahun tidak dapat membuka Modul SIM (backend).
      if (!canAccessSim(user.birthDate)) return null;
    } else if (!isSimModule) {
      // Kategori SD/SMP/SMA/SMK: jenjang harus SAMA untuk semua scope
      // (global, target sekolah, maupun milik sekolah).
      if (mod.educationLevel !== user.educationLevel) return null;
    }
  }

  return mod;
}

/** Simpan progress membaca murid. */
export async function updateModuleProgress(params: {
  moduleId: string;
  userId: string;
  progress: number;
}) {
  const { moduleId, userId, progress } = params;
  const clamped = Math.max(0, Math.min(100, progress));
  return prisma.moduleProgress.upsert({
    where: { moduleId_userId: { moduleId, userId } },
    create: {
      moduleId,
      userId,
      progress: clamped,
      completed: clamped >= 100,
      completedAt: clamped >= 100 ? new Date() : null,
    },
    update: {
      progress: clamped,
      completed: clamped >= 100,
      completedAt: clamped >= 100 ? new Date() : null,
      lastOpened: new Date(),
    },
  });
}