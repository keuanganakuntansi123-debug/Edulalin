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
  "Data yang Anda masukkan tidak sesuai dengan data akun terdaftar.";

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

/**
 * Bandingkan identitas yang diajukan dengan data akun asli.
 * Hanya field yang diisi pengguna DAN tersedia pada akun yang dihitung,
 * sehingga pengguna dengan data minim (mis. admin) tidak dihukum.
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

  const check = (field: string, submittedValue: string | null | undefined, actual: string | null | undefined) => {
    if (!actual || !submittedValue) return;
    applicable.push(field);
    if (sameText(submittedValue, actual)) matched.push(field);
    else mismatch.push(field);
  };

  check("name", submitted.name, user.name);
  check("school", submitted.schoolName, user.school?.name);
  check("educationLevel", submitted.educationLevel, user.educationLevel);
  if (user.role === "MURID") {
    check("classLevel", submitted.classLevel, user.classLevel);
    check("major", submitted.major, user.major);
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
  // Nama wajib cocok + minimal 60% field terverifikasi.
  const verified = matched.includes("name") && score >= 60;

  return {
    verified,
    score,
    matchedFields: matched,
    mismatchFields: mismatch,
    applicableFields: applicable,
  };
}
