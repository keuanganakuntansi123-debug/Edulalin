import type { Role, EducationLevel } from "@/generated/prisma/client";

export const ROLES: Role[] = ["ADMIN", "GURU", "POLISI", "MURID"];
export const EDUCATION_LEVELS: EducationLevel[] = ["SD", "SMP", "SMA", "SMK", "SIM"];

/**
 * Kategori jenjang yang berdiri sendiri di UI: SD, SMP, SMA, SMK.
 * SIM BUKAN kategori — SIM adalah jenis materi/kuis khusus yang berada
 * dalam kategori SMA dan SMK (tetap terpisah via educationLevel = "SIM").
 */
export const DISPLAY_CATEGORIES = ["SD", "SMP", "SMA", "SMK"] as const;
export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

export const DISPLAY_CATEGORY_LABEL: Record<DisplayCategory, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  SMK: "SMK",
};

/** Petakan jenjang data (termasuk SIM) ke kategori tampilan (SIM -> SMA/SMK). */
export function categoryOf(level: EducationLevel | string | null | undefined): DisplayCategory {
  if (level === "SIM") return "SMA";
  if (level === "SD" || level === "SMP" || level === "SMA" || level === "SMK") return level;
  return "SMA";
}

/** Label jenjang untuk ditampilkan. SIM ditampilkan sebagai "SIM". */
export function levelDisplayLabel(level: EducationLevel | string | null | undefined): string {
  if (level === "SIM") return "SIM";
  if (level === "SD" || level === "SMP" || level === "SMA" || level === "SMK") return LEVEL_LABEL[level];
  return level ? String(level) : "-";
}

/**
 * Pencocokan jenjang untuk konten pembelajaran (modul/kuis).
 * - SD/SMP hanya melihat jenjangnya sendiri.
 * - SMA melihat konten SMA + SIM (usia 17+ diperiksa terpisah).
 * - SMK melihat konten SMK + SIM.
 */
export function educationLevelMatch(
  userLevel: EducationLevel | string | null | undefined,
  contentLevel: EducationLevel | string | null | undefined
): boolean {
  if (userLevel == null || contentLevel == null) return false;
  if (contentLevel === "SIM") {
    return userLevel === "SMA" || userLevel === "SMK" || userLevel === "SIM";
  }
  return userLevel === contentLevel;
}

/** Jenjang yang diizinkan untuk konten SIM (subtype dalam kategori SMA & SMK). */
export function simAllowedForLevel(
  userLevel: EducationLevel | string | null | undefined
): boolean {
  return userLevel === "SMA" || userLevel === "SMK" || userLevel === "SIM";
}

/**
 * Jenjang konten (modul/kuis) yang sah untuk seorang murid.
 * SD -> [SD], SMP -> [SMP], SMA -> [SMA, SIM], SMK -> [SMK, SIM].
 * SIM adalah subtype dalam kategori SMA/SMK, bukan kategori sendiri.
 */
export function contentLevelsForMurid(
  userLevel: EducationLevel | string | null | undefined
): EducationLevel[] {
  if (userLevel === "SMA") return ["SMA", "SIM"];
  if (userLevel === "SMK") return ["SMK", "SIM"];
  if (userLevel === "SD" || userLevel === "SMP") return [userLevel];
  return ["SMA"];
}

/**
 * Validasi ketat: sekolah tujuan / jenjang konten harus SAMA dengan jenjang
 * kategori yang dipilih admin. Mengembalikan pesan error bila tidak cocok.
 */
export function validateSchoolLevelMatch(
  rawLevel: string,
  schoolLevels: (EducationLevel | string | null | undefined)[]
): string | null {
  const level = String(rawLevel ?? "").toUpperCase();
  if (!["SD", "SMP", "SMA", "SMK"].includes(level)) {
    return "Jenjang kategori harus salah satu dari SD, SMP, SMA, atau SMK";
  }
  for (const l of schoolLevels) {
    if (l == null) continue;
    if (l !== level) {
      return `Sekolah tujuan memiliki jenjang ${levelDisplayLabel(l)} — tidak cocok dengan kategori ${level}. Pilih hanya sekolah ${level}.`;
    }
  }
  return null;
}

export type CategoryLevel = "SD" | "SMP" | "SMA" | "SMK" | "SIM";

/**
 * Tentukan educationLevel dari daftar jenjang sekolah tujuan.
 * Jika seluruh sekolah tujuan seragam, gunakan jenjang tersebut.
 * Jika campuran, gunakan jenjang mayoritas (tie-break urutan SD -> SMP -> SMA).
 * `isSim` memaksa kategori SIM (digabung ke SMA/SMK pada tampilan).
 */
export function resolveCategory(
  levels: (EducationLevel | string | null | undefined)[],
  isSim?: boolean
): EducationLevel {
  if (isSim) return "SIM";
  const valid = levels.filter(
    (l): l is EducationLevel =>
      l === "SD" || l === "SMP" || l === "SMA" || l === "SMK" || l === "SIM"
  );
  if (valid.length === 0) return "SMA";
  const counts: Partial<Record<EducationLevel, number>> = {};
  for (const l of valid) counts[l] = (counts[l] ?? 0) + 1;
  const order: EducationLevel[] = ["SD", "SMP", "SMA", "SMK"];
  let best: EducationLevel = "SMA";
  let bestCount = -1;
  for (const l of order) {
    const c = counts[l] ?? 0;
    if (c > bestCount) {
      best = l;
      bestCount = c;
    }
  }
  return best;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  GURU: "Guru",
  POLISI: "Polisi",
  MURID: "Murid",
};

export const LEVEL_LABEL: Record<EducationLevel, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  SMK: "SMK",
  SIM: "SIM",
};

export const CLASS_OPTIONS = ["10", "11", "12", "1", "2", "3", "4", "5", "6"];

export type PoliceLevel = "POLSEK" | "POLRES" | "POLDA";

export const POLICE_LEVEL_LABEL: Record<PoliceLevel, string> = {
  POLSEK: "Polsek",
  POLRES: "Polres",
  POLDA: "Polda",
};

export function policeLevelLabel(level: string | null | undefined): string {
  if (!level) return "-";
  return POLICE_LEVEL_LABEL[level as PoliceLevel] ?? level;
}

/** Normalisasi teks bebas jenjang murid ke enum EducationLevel agar tetap tersinkron. */
export function normalizeEducationLevel(input: string, classLevel?: string | null): EducationLevel {
  const raw = (input ?? "").trim().toLowerCase();

  if (/sd|dasar|ibtidaiyah|mi\b|sdn/.test(raw)) return "SD";
  if (/smp|menengah pertama|tsanawiyah|mts/.test(raw)) return "SMP";
  if (/smk|sekolah menengah kejuruan/.test(raw)) return "SMK";
  if (/sma|menengah atas|madrasah aliyah|\bma\b|mak\b/.test(raw)) return "SMA";
  if (/sim|surat izin mengemudi/.test(raw)) return "SIM";

  // Fallback dari kelas jika jenjang tidak dikenali
  const cls = (classLevel ?? "").trim();
  const num = cls.match(/\d+/)?.[0] ?? "";
  if (num) {
    const n = Number(num);
    if (n >= 1 && n <= 6) return "SD";
    if (n >= 7 && n <= 9) return "SMP";
    if (n >= 10 && n <= 12) return "SMA";
  }

  return "SMA";
}

/** Hitung umur dalam tahun berdasarkan tanggal lahir. */
export function getAge(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getRoleLabel(role: Role) {
  return ROLE_LABEL[role];
}

export function dashboardPath(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "GURU":
      return "/dashboard/guru";
    case "POLISI":
      return "/dashboard/polisi";
    default:
      return "/dashboard/murid";
  }
}