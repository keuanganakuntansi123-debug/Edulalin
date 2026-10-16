import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie, clearSessionCookie, getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/validations";
import { headers } from "next/headers";
import { z } from "zod";
import { dashboardPath, normalizeEducationLevel } from "@/lib/constants";
export { dashboardPath };

export type AuthResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string>; message: string };

function genericError(): AuthResult<never> {
  return {
    success: false,
    errors: {},
    message: "Email atau password salah",
  };
}

function accountUnavailableError(): AuthResult<never> {
  return {
    success: false,
    errors: {},
    message:
      "Akun tidak dapat digunakan: akun dinonaktifkan atau terhubung ke sekolah yang sudah tidak aktif. Hubungi Admin.",
  };
}

/** Login dengan email & password. Hanya user aktif yang bisa masuk. */
export async function login(input: LoginInput): Promise<AuthResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: zodErrors(parsed), message: "Periksa kembali input Anda" };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Akun tidak ditemukan / dinonaktifkan / terhapus — beri tahu pengguna agar
  // dapat menghubungi admin, tanpa membocorkan detail akun.
  if (!user) return genericError();
  if (user.deletedAt || user.status === "INACTIVE" || user.status === "PENDING") {
    return accountUnavailableError();
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return genericError();

  const token = await createSessionToken({ userId: user.id, role: user.role });
  await setSessionCookie(token);

  const reqHeaders = await headers();
  await logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "LOGIN",
    entity: "USER",
    entityId: user.id,
    ipAddress: reqHeaders.get("x-forwarded-for"),
    userAgent: reqHeaders.get("user-agent"),
  });

  const redirectTo = dashboardPath(user.role);
  return { success: true, data: { redirectTo } };
}

/** Registrasi publik HANYA untuk MURID. Role ditetapkan server. */
export async function register(input: RegisterInput): Promise<AuthResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: zodErrors(parsed), message: "Periksa kembali data pendaftaran" };
  }
  const data = parsed.data;
  const educationLevel = normalizeEducationLevel(data.educationLevel ?? "", data.classLevel);

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return { success: false, errors: {}, message: "Email sudah terdaftar" };
  }

  // Cari sekolah berdasarkan nama (tidak peka huruf besar/kecil).
  // Hanya sekolah AKTIF (belum dihapus) yang dipakai, supaya murid baru tidak
  // terhubung ke sekolah yang sudah diarsipkan/dihapus (yang memblokir login).
  // Jika belum ada, sekolah dibuat otomatis sehingga data tetap terintegrasi.
  const schoolName = data.schoolName.trim();
  let school = await prisma.school.findFirst({
    where: { name: { equals: schoolName, mode: "insensitive" }, deletedAt: null },
  });
  if (!school) {
    // Coba aktifkan kembali sekolah nonaktif dengan nama sama (jika ada),
    // supaya murid terhubung ke sekolah terdaftar yang valid.
    const inactive = await prisma.school.findFirst({
      where: { name: { equals: schoolName, mode: "insensitive" }, deletedAt: { not: null } },
    });
    if (inactive) {
      school = await prisma.school.update({
        where: { id: inactive.id },
        data: { status: "ACTIVE", deletedAt: null, deletedBy: null },
      });
    }
  }
  if (!school) {
    const slug = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    school = await prisma.school.create({
      data: {
        code: `SKL-${slug || "sekolah"}-${Date.now().toString(36)}`,
        name: schoolName,
        educationLevel,
        address: "-",
        city: "-",
        province: "-",
        status: "ACTIVE",
      },
    });
  }

  // Role MURID selalu ditetapkan server; tanggalkan tanggal lahir di atas 100 tahun
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash,
      role: "MURID",
      birthDate: data.birthDate,
      schoolId: school.id,
      educationLevel,
      classLevel: data.classLevel,
      phone: data.phone ?? null,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });

  const reqHeaders = await headers();
  await logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "REGISTER",
    entity: "USER",
    entityId: user.id,
    ipAddress: reqHeaders.get("x-forwarded-for"),
    userAgent: reqHeaders.get("user-agent"),
  });

  // Setelah registrasi berhasil, arahkan pengguna ke halaman Login.
  return { success: true, data: { redirectTo: "/login" } };
}

export async function logout(): Promise<void> {
  const reqHeaders = await headers();
  const user = await getCurrentUser();
  if (user) {
    await logActivity({
      actorId: user.id,
      schoolId: user.schoolId,
      action: "LOGOUT",
      entity: "USER",
      entityId: user.id,
      ipAddress: reqHeaders.get("x-forwarded-for"),
      userAgent: reqHeaders.get("user-agent"),
    });
  }
  await clearSessionCookie();
}

type ZodFail<T> = { success: false; error: z.ZodError<T> };

function zodErrors<T>(result: ZodFail<T>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!flat[key]) flat[key] = issue.message;
  }
  return flat;
}