import { redirect } from "next/navigation";
import type { Role, EducationLevel } from "@/generated/prisma/client";
import { getCurrentUser, getSessionPayload } from "@/lib/session";

/**
 * Otorisasi berbasis role. Mengembalikan user lengkap atau redirect.
 * Panggil dari server component / server action.
 */
export async function requireRole(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function requireRoleOrNull(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

/** Guard ringan untuk proxy.ts — hanya membaca JWT, tidak menyentuh DB. */
export async function proxyGuard(
  allowed: Role[]
): Promise<{ ok: true; role: Role } | { ok: false; redirectTo: string }> {
  const payload = await getSessionPayload();
  if (!payload) return { ok: false, redirectTo: "/login" };
  if (!allowed.includes(payload.role)) return { ok: false, redirectTo: "/dashboard" };
  return { ok: true, role: payload.role };
}

/**
 * School isolation: pastikan target school cocok dengan scope user.
 * ADMIN = global. GURU = sekolah sendiri. MURID = sekolah sendiri.
 * POLISI tidak melalui fungsi ini (lintas sekolah read-only).
 */
export function assertSameSchoolOrAdmin(
  user: { role: Role; schoolId: string | null },
  targetSchoolId: string | null | undefined
): boolean {
  if (user.role === "ADMIN") return true;
  if (targetSchoolId == null) return true; // konten global
  return user.schoolId === targetSchoolId;
}

/**
 * Validasi akses konten berdasarkan role + scope.
 * - ADMIN boleh semua
 * - GURU hanya sekolah sendiri (dan scope jenjang/kelas bila ada)
 * - MURID hanya sekolah & jenjang & kelas
 */
export function canAccessContent(params: {
  user: { role: Role; schoolId: string | null; educationLevel: EducationLevel | null; classLevel: string | null };
  content: {
    schoolId: string | null;
    educationLevel: EducationLevel;
    classLevel: string | null;
  };
}): boolean {
  const { user, content } = params;
  if (user.role === "ADMIN") return true;

  // Konten specific sekolah harus match
  if (
    content.schoolId != null &&
    (!user.schoolId || user.schoolId !== content.schoolId)
  ) {
    return false;
  }

  // Jenjang harus match (kecuali user adalah guru/polisi yang membaca laporan)
  if (user.role === "MURID") {
    if (user.educationLevel && user.educationLevel !== content.educationLevel) return false;
    if (user.classLevel && content.classLevel && user.classLevel !== content.classLevel) return false;
  }

  return true;
}