import type { Role, EducationLevel } from "@/generated/prisma/client";

export const ROLES: Role[] = ["ADMIN", "GURU", "POLISI", "MURID"];

/**
 * Jenjang yang berdiri sendiri di UI: SD, SMP, SMA, SMK.
 * SIM BUKAN jenjang — SIM adalah jenis materi/kuis khusus yang berada
 * dalam kategori SMA dan SMK (tetap terpisah via educationLevel = "SIM").
 */
export const EDUCATION_LEVELS: EducationLevel[] = ["SD", "SMP", "SMA", "SMK"];

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

/** Pilihan kelas sesuai jenjang: SD 1-6, SMP 7-9, SMA/SMK 10-12. */
export const CLASS_OPTIONS_BY_LEVEL: Record<"SD" | "SMP" | "SMA" | "SMK", string[]> = {
  SD: ["1", "2", "3", "4", "5", "6"],
  SMP: ["7", "8", "9"],
  SMA: ["10", "11", "12"],
  SMK: ["10", "11", "12"],
};

/**
 * Daftar kelas yang sah untuk sebuah jenjang. Mengembalikan daftar kosong bila
 * jenjang belum dipilih/tidak dikenali, sehingga pengguna tidak bisa memilih
 * kelas yang tidak sesuai (mis. kelas 10 untuk SD).
 */
export function classOptionsForLevel(level: EducationLevel | string | null | undefined): string[] {
  const lvl = String(level ?? "").toUpperCase();
  if (lvl === "SD" || lvl === "SMP" || lvl === "SMA" || lvl === "SMK") {
    return CLASS_OPTIONS_BY_LEVEL[lvl];
  }
  return [];
}

// =====================================================================
// Standarisasi nama sekolah
// =====================================================================

export type SchoolType = "NEGERI" | "SWASTA";

/**
 * Prefiks resmi nama sekolah per jenjang & jenis.
 * - Negeri : SDN, SMPN, SMAN, SMKN
 * - Swasta : SDS, SMPS, SMAS, SMKS
 */
export const SCHOOL_PREFIX: Record<"SD" | "SMP" | "SMA" | "SMK", Record<SchoolType, string>> = {
  SD: { NEGERI: "SDN", SWASTA: "SDS" },
  SMP: { NEGERI: "SMPN", SWASTA: "SMPS" },
  SMA: { NEGERI: "SMAN", SWASTA: "SMAS" },
  SMK: { NEGERI: "SMKN", SWASTA: "SMKS" },
};

export function schoolTypeLabel(type: SchoolType): string {
  return type === "NEGERI" ? "Negeri" : "Swasta";
}

/** Prefiks resmi untuk kombinasi jenjang + jenis, mis. SMK + NEGERI -> "SMKN". */
export function schoolPrefixFor(
  level: EducationLevel | string | null | undefined,
  type: SchoolType
): string | null {
  const lvl = String(level ?? "").toUpperCase();
  if (lvl === "SD" || lvl === "SMP" || lvl === "SMA" || lvl === "SMK") {
    return SCHOOL_PREFIX[lvl][type];
  }
  return null;
}

/** Rapikan teks identitas: kapital, tanpa spasi berlebih. */
export function normalizeIdentityName(value: string | null | undefined): string {
  return (value ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/**
 * Setarakan penulisan panjang menjadi prefiks resmi, mis.
 * "SMP NEGERI 1 JAKARTA" -> "SMPN 1 JAKARTA", "SMA SWASTA BUDI" -> "SMAS BUDI".
 * Membuat input pengguna tetap diterima tanpa menghasilkan sekolah duplikat.
 */
function canonicalizeSchoolPrefix(value: string): string {
  return value
    .replace(/^SD\s+NEGERI\b/, "SDN")
    .replace(/^SMP\s+NEGERI\b/, "SMPN")
    .replace(/^SMA\s+NEGERI\b/, "SMAN")
    .replace(/^SMK\s+NEGERI\b/, "SMKN")
    .replace(/^SD\s+SWASTA\b/, "SDS")
    .replace(/^SMP\s+SWASTA\b/, "SMPS")
    .replace(/^SMA\s+SWASTA\b/, "SMAS")
    .replace(/^SMK\s+SWASTA\b/, "SMKS");
}

/** Deteksi jenis sekolah (Negeri/Swasta) dari prefiks nama sekolah. */
export function detectSchoolType(
  name: string | null | undefined
): SchoolType | null {
  const raw = canonicalizeSchoolPrefix(normalizeIdentityName(name));
  if (!raw) return null;
  const first = raw.split(" ")[0];
  if (["SDN", "SMPN", "SMAN", "SMKN"].includes(first)) return "NEGERI";
  if (["SDS", "SMPS", "SMAS", "SMKS"].includes(first)) return "SWASTA";
  return null;
}

export type SchoolNameCheck = {
  ok: boolean;
  educationLevel: "SD" | "SMP" | "SMA" | "SMK" | null;
  schoolType: SchoolType | null;
  normalized: string;
  error: string | null;
};

/**
 * Validasi & normalisasi nama sekolah sesuai format resmi:
 * `SDN 01 JAKARTA` (Negeri) atau `SMKS BUDI LUHUR` (Swasta).
 *
 * Prefiks menentukan jenjang sekaligus jenis sekolah, sehingga data tetap
 * sinkron dan tidak membuat duplikat akibat perbedaan penulisan/ kapitalisasi.
 * Bila `expectedLevel` diberikan, jenjang dari prefiks harus cocok dengannya.
 */
export function validateSchoolName(
  name: string | null | undefined,
  expectedLevel?: EducationLevel | string | null
): SchoolNameCheck {
  const normalized = canonicalizeSchoolPrefix(normalizeIdentityName(name));
  if (!normalized) {
    return {
      ok: false,
      educationLevel: null,
      schoolType: null,
      normalized,
      error: "Nama sekolah wajib diisi.",
    };
  }
  const first = normalized.split(" ")[0];
  const found = (Object.keys(SCHOOL_PREFIX) as ("SD" | "SMP" | "SMA" | "SMK")[]).find(
    (lvl) => SCHOOL_PREFIX[lvl].NEGERI === first || SCHOOL_PREFIX[lvl].SWASTA === first
  );
  if (!found) {
    return {
      ok: false,
      educationLevel: null,
      schoolType: null,
      normalized,
      error:
        "Format nama sekolah tidak sesuai. Gunakan SDN/SMPN/SMAN/SMKN untuk sekolah negeri atau SDS/SMPS/SMAS/SMKS untuk sekolah swasta. Contoh: SMKN 15 JAKARTA atau SMKS BUDI LUHUR.",
    };
  }
  const schoolType: SchoolType =
    SCHOOL_PREFIX[found].NEGERI === first ? "NEGERI" : "SWASTA";

  if (expectedLevel) {
    const expected = String(expectedLevel).trim().toUpperCase();
    if (
      (expected === "SD" || expected === "SMP" || expected === "SMA" || expected === "SMK") &&
      expected !== found
    ) {
      return {
        ok: false,
        educationLevel: found,
        schoolType,
        normalized,
        error: `Nama sekolah berawalan "${first}" menandakan jenjang ${found}, tetapi jenjang yang dipilih ${expected}. Samakan keduanya.`,
      };
    }
  }

  return { ok: true, educationLevel: found, schoolType, normalized, error: null };
}

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