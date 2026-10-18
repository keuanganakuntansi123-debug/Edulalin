import { prisma } from "@/lib/prisma";
import { educationLevelMatch, getAge } from "@/lib/constants";
import type { Role, EducationLevel } from "@/generated/prisma/client";

export type ModuleScope = {
  schoolId?: string | null;
  educationLevel: EducationLevel;
  classLevel?: string | null;
  birthDate?: Date | null;
};

/** Penanda modul SIM yang dibuka oleh murid. */
export type ModuleAccessFlag = {
  isSim: boolean;
  simLocked: boolean;
};

/** Daftar modul yang boleh dilihat murid sesuai scope sekolah + jenjang + kelas. */
export async function listModulesForMurid(scope: ModuleScope & { userId: string }) {
  const { schoolId, educationLevel, userId, birthDate } = scope;
  const simAllowed = canAccessSim(birthDate);
  const modules = await prisma.module.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      // Murid SMA/SMK melihat modul jenjangnya + SIM; SD/SMP hanya jenjangnya.
      ...(educationLevel === "SMA"
        ? { educationLevel: { in: ["SMA", "SIM"] } }
        : educationLevel === "SMK"
          ? { educationLevel: { in: ["SMK", "SIM"] } }
          : { educationLevel: educationLevel ?? undefined }),
    },
    include: {
      moduleToSchools: { select: { schoolId: true } },
      thumbnailFile: { select: { storedName: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });


  const visible = modules.filter((m) => {
    const targets = m.moduleToSchools.map((s) => s.schoolId);
    const isSchoolOwned = m.schoolId != null;
    const isTargeted = !isSchoolOwned && targets.length > 0;
    const isGlobal = !isSchoolOwned && targets.length === 0;

    // Modul milik sekolah tertentu: hanya murid sekolah itu.
    if (isSchoolOwned) return m.schoolId === schoolId;

    // Modul yang ditargetkan admin ke sekolah murid: tampil (ID sekolah),
    // tanpa menuntut jenjang konten = jenjang murid. Admin bertanggung jawab
    // memilih sekolah tujuan yang benar.
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
  const isGlobal = !isSchoolOwned && !hasTargets;

  if (isSchoolOwned && mod.schoolId !== user.schoolId) return null;
  if (isTargeted && (!user.schoolId || !targetSchools.includes(user.schoolId))) return null;

  // Jenjang + aturan SIM untuk murid. Untuk modul yang ditarget sekolah,
  // keanggotaan sekolah cukup (admin sudah memilih sekolah tujuan).
  if (user.role === "MURID" && user.educationLevel) {
    const isSimModule = mod.educationLevel === "SIM";
    if (isSimModule) {
      // Modul SIM tergabung dalam kategori SMA/SMK — hanya murid SMA/SMK.
      if (
        user.educationLevel !== "SMA" &&
        user.educationLevel !== "SMK" &&
        user.educationLevel !== "SIM"
      ) {
        return null;
      }
      // Murid di bawah 17 tahun tidak dapat membuka Modul SIM (backend).
      if (!canAccessSim(user.birthDate)) return null;
    } else if (isGlobal && !educationLevelMatch(user.educationLevel, mod.educationLevel)) {
      return null;
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