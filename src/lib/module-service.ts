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
  thumbnailFile: { select: { storedName: true, mimeType: true } },
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

    // Kelas: modul tanpa kelas berlaku untuk semua kelas. Bila modul
    // menyebutkan kelas tertentu, murid harus berada di kelas itu — supaya
    // modul yang diberikan admin ke kelas lain tidak bocor ke murid ini.
    if (scope.classLevel && m.classLevel && m.classLevel !== scope.classLevel) {
      return false;
    }

    // Modul milik sekolah tertentu: hanya murid sekolah itu.
    if (isSchoolOwned) return m.schoolId === schoolId;

    // Modul yang ditargetkan admin ke sekolah murid: hanya SEKOLAH dengan
    // jenjang yang cocok (levelOk sudah membatasi). ID sekolah tetap diverifikasi.
    if (isTargeted) {
      // Tanpa sekolah (mis. murid belum dipetakan): hanya konten global.
      if (!schoolId) return false;
      return targets.includes(schoolId);
    }

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
          select: { id: true, progress: true, completed: true, lastPage: true, totalPages: true },
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

/** Jenjang konten yang boleh dibaca guru berdasarkan jenjang sekolahnya. */
export function guruAllowedLevels(
  educationLevel: EducationLevel | null | undefined
): EducationLevel[] {
  if (educationLevel === "SMA") return ["SMA", "SIM"];
  if (educationLevel === "SMK") return ["SMK", "SIM"];
  if (educationLevel === "SD" || educationLevel === "SMP") return [educationLevel];
  return ["SD", "SMP", "SMA", "SMK", "SIM"];
}

/** Daftar modul untuk GURU: modul global + modul sekolah tempat mengajar,
 * diffilter jenjang sekolah. SIM hanya tampil untuk sekolah SMA/SMK. */
export async function listModulesForGuru(params: {
  schoolId: string | null;
  educationLevel: EducationLevel | null;
}) {
  const { schoolId, educationLevel } = params;
  const allowedLevels = guruAllowedLevels(educationLevel);
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
      thumbnailFile: { select: { storedName: true, mimeType: true } },
      _count: { select: { progresses: true, quizzes: true } },
    },
  });
  return modules;
}

/**
 * Ambil satu modul untuk GURU (mode baca). Menghormati isolasi sekolah
 * (modul global, milik sekolah, atau ditargetkan ke sekolah guru) dan
 * jenjang sekolah guru. Mengembalikan null bila di luar jangkauan.
 */
export async function getModuleForGuru(params: {
  moduleId: string;
  schoolId: string | null;
  educationLevel: EducationLevel | null;
}) {
  const { moduleId, schoolId, educationLevel } = params;
  const allowedLevels = guruAllowedLevels(educationLevel);
  const mod = await prisma.module.findFirst({
    where: {
      id: moduleId,
      deletedAt: null,
      educationLevel: { in: allowedLevels },
      OR: [
        { schoolId: null, moduleToSchools: { none: {} } },
        ...(schoolId
          ? [{ schoolId }, { moduleToSchools: { some: { schoolId } } }]
          : []),
      ],
    },
    include: {
      moduleToSchools: { select: { schoolId: true } },
      contentFile: { select: { storedName: true, originalName: true, mimeType: true } },
      thumbnailFile: { select: { storedName: true, mimeType: true } },
    },
  });
  return mod;
}

/** Daftar modul untuk POLISI: seluruh modul aktif semua sekolah (read-only). */
export async function listModulesForPolisi() {
  const modules = await prisma.module.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      thumbnailFile: { select: { storedName: true, mimeType: true } },
      school: { select: { id: true, name: true, educationLevel: true } },
      moduleToSchools: {
        select: { school: { select: { id: true, name: true, educationLevel: true } } },
      },
      _count: { select: { progresses: true, quizzes: true } },
    },
  });
  return modules;
}

export type PolisiModule = Awaited<ReturnType<typeof listModulesForPolisi>>[number];

/**
 * Kelompokkan modul Polisi per jenjang lalu per sekolah.
 * Modul global (tanpa sekolah tujuan) dikelompokkan ke "Semua Sekolah".
 * Polisi hanya membaca — tidak ada aksi ubah/nilai.
 */
export function groupPolisiModulesByLevelThenSchool(modules: PolisiModule[]) {
  const byLevel = new Map<
    string,
    Map<string, { schoolId: string | null; schoolName: string; modules: PolisiModule[] }>
  >();

  for (const m of modules) {
    const level = m.educationLevel;
    if (!byLevel.has(level)) byLevel.set(level, new Map());
    const schools = byLevel.get(level)!;

    // Modul milik satu sekolah, atau ditargetkan ke beberapa sekolah,
    // atau global (tanpa tujuan) → tampil juga di "Semua Sekolah".
    const targets =
      m.school != null
        ? [{ id: m.school.id, name: m.school.name }]
        : m.moduleToSchools.length > 0
          ? m.moduleToSchools.map((t) => ({ id: t.school.id, name: t.school.name }))
          : [{ id: null, name: "Semua Sekolah" }];

    for (const t of targets) {
      const key = t.id ?? "__global__";
      if (!schools.has(key)) {
        schools.set(key, { schoolId: t.id, schoolName: t.name, modules: [] });
      }
      schools.get(key)!.modules.push(m);
    }
  }

  const levelOrder: EducationLevel[] = ["SD", "SMP", "SMA", "SMK", "SIM"];
  return [...byLevel.entries()]
    .sort((a, b) => levelOrder.indexOf(a[0] as EducationLevel) - levelOrder.indexOf(b[0] as EducationLevel))
    .map(([level, schools]) => ({
      level: level as EducationLevel,
      schools: [...schools.values()].sort((a, b) =>
        a.schoolId === null ? -1 : b.schoolId === null ? 1 : a.schoolName.localeCompare(b.schoolName)
      ),
      moduleCount: new Set(schools.values().flatMap((s) => s.modules.map((m) => m.id))).size,
    }));
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
      thumbnailFile: { select: { storedName: true, mimeType: true } },
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
  lastPage?: number | null;
  totalPages?: number | null;
}) {
  const { moduleId, userId, progress, lastPage, totalPages } = params;
  const clamped = Math.max(0, Math.min(100, progress));
  const page = lastPage != null ? Math.max(1, Math.floor(lastPage)) : undefined;
  const pages = totalPages != null ? Math.max(0, Math.floor(totalPages)) : undefined;
  return prisma.moduleProgress.upsert({
    where: { moduleId_userId: { moduleId, userId } },
    create: {
      moduleId,
      userId,
      progress: clamped,
      completed: clamped >= 100,
      completedAt: clamped >= 100 ? new Date() : null,
      lastPage: page ?? null,
      totalPages: pages ?? null,
    },
    update: {
      progress: clamped,
      completed: clamped >= 100,
      completedAt: clamped >= 100 ? new Date() : null,
      lastOpened: new Date(),
      ...(page != null ? { lastPage: page } : {}),
      ...(pages != null ? { totalPages: pages } : {}),
    },
  });
}