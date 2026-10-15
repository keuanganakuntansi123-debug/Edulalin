import type { Role, EducationLevel } from "@/generated/prisma/client";

export const ROLES: Role[] = ["ADMIN", "GURU", "POLISI", "MURID"];
export const EDUCATION_LEVELS: EducationLevel[] = ["SD", "SMP", "SMA", "SIM"];

/** Kategori yang ditampilkan di UI. Modul/kuis SIM digabung ke SMA/SMK. */
export const DISPLAY_CATEGORIES = ["SD", "SMP", "SMA"] as const;
export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

export const DISPLAY_CATEGORY_LABEL: Record<DisplayCategory, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA/SMK",
};

/** Petakan jenjang data (termasuk SIM) ke kategori tampilan. */
export function categoryOf(level: EducationLevel | string | null | undefined): DisplayCategory {
  if (level === "SIM") return "SMA";
  if (level === "SD" || level === "SMP" || level === "SMA") return level;
  return "SMA";
}

/** Label jenjang untuk ditampilkan. Modul/kuis SIM tampil sebagai "SMA/SMK". */
export function levelDisplayLabel(level: EducationLevel | string | null | undefined): string {
  if (level === "SIM") return "SMA/SMK";
  if (level === "SD" || level === "SMP" || level === "SMA") return LEVEL_LABEL[level];
  return level ? String(level) : "-";
}

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
  const valid = levels.filter((l): l is EducationLevel => l === "SD" || l === "SMP" || l === "SMA" || l === "SIM");
  if (valid.length === 0) return "SMA";
  const counts: Partial<Record<EducationLevel, number>> = {};
  for (const l of valid) counts[l] = (counts[l] ?? 0) + 1;
  const order: EducationLevel[] = ["SD", "SMP", "SMA"];
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
  if (/sma|smk|menengah atas|madrasah aliyah|\bma\b|mak\b/.test(raw)) return "SMA";
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