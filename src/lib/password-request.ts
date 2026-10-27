import type { EducationLevel, PoliceLevel, Role } from "@/generated/prisma/client";

/**
 * Verifikasi identitas pengajuan reset password.
 *
 * Pengguna menemukan akunnya lewat email (unik), lalu identitas tambahan
 * (nama, sekolah, kelas, jurusan, kesatuan) dicocokkan dengan data akun asli
 * untuk mencegah pengambilalihan akun hanya bermodal email. Hasil verifikasi
 * dipakai Admin sebagai bahan pertimbangan — keputusan akhir tetap di Admin.
 */

export type ResetIdentityInput = {
  email: string;
  name: string;
  schoolName?: string;
  educationLevel?: string;
  classLevel?: string;
  major?: string;
  subject?: string;
  policeLevel?: string;
  policeUnit?: string;
  policeDivision?: string;
};

export type IdentityCheckResult = {
  verified: boolean;
  score: number;
  matchedFields: string[];
  mismatchFields: string[];
  applicableFields: string[];
};

/** Peringatan resmi saat identitas pengajuan tidak cocok dengan akun terdaftar. */
export const IDENTITY_MISMATCH_MESSAGE =
  "Data identitas tidak sesuai dengan data akun terdaftar.";

const FIELD_LABEL: Record<string, string> = {
  name: "Nama Lengkap",
  school: "Sekolah",
  educationLevel: "Jenjang",
  classLevel: "Kelas",
  major: "Jurusan",
  subject: "Mata Pelajaran",
  policeLevel: "Tingkat Kesatuan",
  policeUnit: "Nama Kesatuan",
  policeDivision: "Divisi / Satuan",
};

export function identityFieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

/**
 * Validasi kekuatan password baru. Mengembalikan pesan error atau null bila sah.
 * Dipakai bersama oleh aksi pengguna (ubah password) dan aksi Admin (reset).
 */
export function validatePasswordStrength(
  password: string,
  confirm?: string,
  phone?: string | null
): string | null {
  if (password.length < 8) return "Password baru minimal 8 karakter.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password baru wajib mengandung huruf dan angka.";
  }
  if (confirm !== undefined && password !== confirm) {
    return "Konfirmasi password tidak sama.";
  }
  if (phone && password.replace(/\D/g, "") === phone.replace(/\D/g, "")) {
    return "Password baru tidak boleh sama dengan nomor telepon terdaftar.";
  }
  return null;
}

/** Normalisasi teks bebas agar perbandingan tidak sensitif kapitalisasi/spasi. */
export function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeIdentityText(a);
  const nb = normalizeIdentityText(b);
  return na.length > 0 && na === nb;
}

/** Buang semua karakter selain huruf & angka (untuk perbandingan toleran). */
function compact(value: string | null | undefined): string {
  return normalizeIdentityText(value).replace(/[^A-Z0-9]/g, "");
}

/**
 * Pencocokan nama yang toleran terhadap gelar dan singkatan.
 *
 * Nama dianggap cocok bila salah satu terisi dan :
 * - sama persis setelah normalisasi (huruf besar & spasi rapi), atau
 * - salah satu memuat yang lain (mis. "BUDI SANTOSO" vs "BUDI SANTOSO, S.PD"), atau
 * - token huruf tersedianya identik (mis. "A. WIJAYA" vs "ANDI WIJAYA").
 */
function nameMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeIdentityText(a);
  const nb = normalizeIdentityText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Hindari positif palsu untuk nama satu kata (mis. "ANNA" vs "ANNABEL").
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  const ta = na.split(" ");
  const tb = nb.split(" ");
  if (ta.length >= 2 && tb.length >= 2) {
    const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    if (short.every((token, i) => token === long[i])) return true;
  }
  return compact(na) === compact(nb);
}

/**
 * Bentuk kanonik nama sekolah: menyetarakan singkatan prefiks sehingga
 * "SMAN 82 JAKARTA", "SMA NEGERI 82 JAKARTA", dan "SMAN 82" menjadi setara.
 */
function canonicalSchool(value: string): string {
  return value
    .replace(/\bSMAN\b/g, "SMA N")
    .replace(/\bSMKN\b/g, "SMK N")
    .replace(/\bSMPN\b/g, "SMP N")
    .replace(/\bSDN\b/g, "SD N")
    .replace(/\bSMAS\b/g, "SMA S")
    .replace(/\bSMKS\b/g, "SMK S")
    .replace(/\bSMPS\b/g, "SMP S")
    .replace(/\bSDS\b/g, "SD S")
    .replace(/\bNEGERI\b/g, "N")
    .replace(/\bSWASTA\b/g, "S")
    .replace(/\bSEKOLAH\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function schoolMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeIdentityText(a);
  const nb = normalizeIdentityText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Satu daftar token boleh menjadi awalan daftar lainnya (mis. "SMAN 82"
  // cocok dengan "SMAN 82 JAKARTA"), tetapi angka harus sama persis sehingga
  // "SMAN 1" tidak dianggap sama dengan "SMAN 12 JAKARTA".
  const ta = na.split(" ");
  const tb = nb.split(" ");
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.every((token, i) => token === long[i])) return true;
  const ca = canonicalSchool(na);
  const cb = canonicalSchool(nb);
  return ca.length > 0 && ca === cb;
}

/**
 * Pencocokan teks detail (kelas, jurusan, mata pelajaran, kesatuan).
 *
 * Ketat: "10 OTKP" dengan "12 OTKP" TIDAK cocok. Toleransi hanya diberikan
 * untuk spasi dan sufiks yang sangat mirip (mis. "XII" vs "XII ").
 */
function detailMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  return sameText(a, b);
}

/**
 * Bandingkan identitas yang diajukan dengan data akun asli.
 *
 * - Field yang diisi pengguna DAN tersedia pada akun dihitung sebagai
 *   kecocokan bila valuenya sama.
 * - Field detail (jenjang, kelas, jurusan, mata pelajaran, kesatuan) yang
 *   diisi pengguna tetapi TIDAK COCOK otomatis menggagalkan verifikasi.
 * - Bila akun tidak menyimpan detail apa pun selain nama (mis. admin), hanya
 *   nama yang diperiksa sehingga pengguna dengan data minim tidak "dihukum".
 */
export function verifyResetIdentity(
  user: {
    name: string;
    email: string;
    role: Role;
    educationLevel: EducationLevel | null;
    classLevel: string | null;
    major: string | null;
    subject: string | null;
    policeLevel: PoliceLevel | null;
    policeUnit: string | null;
    policeDivision: string | null;
    school?: { name: string } | null;
  },
  submitted: ResetIdentityInput
): IdentityCheckResult {
  const matched: string[] = [];
  const mismatch: string[] = [];
  const applicable: string[] = [];

  const check = (
    field: string,
    submittedValue: string | null | undefined,
    actual: string | null | undefined,
    match: (a: string | null | undefined, b: string | null | undefined) => boolean = detailMatches
  ) => {
    if (!actual || !submittedValue) return;
    applicable.push(field);
    if (match(submittedValue, actual)) matched.push(field);
    else mismatch.push(field);
  };

  check("name", submitted.name, user.name, nameMatches);
  check("school", submitted.schoolName, user.school?.name, schoolMatches);
  check("educationLevel", submitted.educationLevel, user.educationLevel);
  if (user.role === "MURID") {
    check("classLevel", submitted.classLevel, user.classLevel);
    // Jurusan hanya diverifikasi untuk SMA/SMK (SD/SMP tidak memiliki jurusan).
    if (user.educationLevel === "SMA" || user.educationLevel === "SMK") {
      check("major", submitted.major, user.major);
    }
  }
  if (user.role === "GURU") {
    check("subject", submitted.subject, user.subject);
  }
  if (user.role === "POLISI") {
    check("policeLevel", submitted.policeLevel, user.policeLevel);
    check("policeUnit", submitted.policeUnit, user.policeUnit);
    check("policeDivision", submitted.policeDivision, user.policeDivision);
  }

  const total = matched.length + mismatch.length;
  const score = total === 0 ? 0 : Math.round((matched.length / total) * 100);
  // Nama wajib cocok, tidak boleh ada detail identitas yang bertentangan,
  // dan minimal 60% field yang dibandingkan terverifikasi.
  const verified = matched.includes("name") && mismatch.length === 0 && score >= 60;

  return {
    verified,
    score,
    matchedFields: matched,
    mismatchFields: mismatch,
    applicableFields: applicable,
  };
}
