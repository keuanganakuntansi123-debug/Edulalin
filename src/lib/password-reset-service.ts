import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  validatePasswordStrength,
  verifyResetIdentity,
  IDENTITY_MISMATCH_MESSAGE,
} from "@/lib/password-request";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Inti logika alur "Lupa Password via Admin".
 *
 * Dipisahkan dari server action agar dapat diuji langsung terhadap Neon DB
 * (tanpa request scope Next.js). Server action hanya menambahkan otorisasi,
 * audit, dan revalidasi di atas fungsi-fungsi ini.
 */

export const NOT_REGISTERED = "Email tidak terdaftar di EDULALIN.";
/** Pengajuan identik dianggap duplikat bila masih PENDING dalam jendela ini. */
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
/** Batas jumlah pengajuan per akun per jam (anti-spam). */
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordRequestResult = {
  success?: boolean;
  error?: string;
  message?: string;
  requestId?: string;
  status?: string;
  verified?: boolean;
  /** Hasil pengiriman notifikasi (diisi oleh lapisan server action). */
  notifications?: { admins: number; emailsSent: number; emailsFailed: number };
  /** Hasil pengiriman email konfirmasi (diisi oleh lapisan server action). */
  email?: { logId: string | null; ok: boolean; error?: string };
  /** Hanya diisi oleh fungsi inti untuk kebutuhan audit. */
  audit?: {
    userId?: string;
    schoolId?: string | null;
    role?: string;
    email?: string;
    name?: string;
    schoolName?: string | null;
    changedAt?: string;
    matchScore?: number;
    matchedFields?: string[];
    mismatchFields?: string[];
  };
};

export type ResetSubmission = {
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
  note?: string;
};

/** Buat pengajuan reset password untuk email terdaftar. */
export async function submitPasswordResetRequest(
  input: ResetSubmission
): Promise<PasswordRequestResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!EMAIL_RE.test(email)) return { error: "Format email tidak valid." };
  if (name.length < 2) return { error: "Nama lengkap wajib diisi." };

  const user = await prisma.user.findUnique({
    where: { email },
    include: { school: { select: { name: true } } },
  });
  if (!user || user.deletedAt || user.status === "INACTIVE") {
    return { error: NOT_REGISTERED };
  }

  // Anti-spam: batasi jumlah pengajuan per akun per jam.
  const recentCount = await prisma.passwordResetRequest.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RATE_WINDOW_MS) } },
  });
  if (recentCount >= RATE_MAX) {
    return { error: "Terlalu banyak pengajuan. Silakan coba lagi dalam 1 jam." };
  }

  // Hindari duplikat: pengajuan PENDING yang masih baru dianggap sama.
  const pending = await prisma.passwordResetRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (pending && Date.now() - pending.createdAt.getTime() < DUPLICATE_WINDOW_MS) {
    return {
      success: true,
      requestId: pending.id,
      status: pending.status,
      verified: pending.verified,
      message:
        "Pengajuan Anda sudah diterima dan sedang menunggu verifikasi Admin. Mohon tunggu.",
      audit: { userId: user.id, schoolId: user.schoolId, role: user.role, email },
    };
  }

  const check = verifyResetIdentity(user, {
    email,
    name,
    schoolName: input.schoolName,
    educationLevel: input.educationLevel,
    classLevel: input.classLevel,
    major: input.major,
    subject: input.subject,
    policeLevel: input.policeLevel,
    policeUnit: input.policeUnit,
    policeDivision: input.policeDivision,
  });

  // Identitas wajib cocok dengan data akun asli. Bila tidak, pengajuan ditolak
  // dengan peringatan resmi dan data pengguna tidak diubah sama sekali.
  if (!check.verified) {
    return {
      error: IDENTITY_MISMATCH_MESSAGE,
      audit: {
        userId: user.id,
        schoolId: user.schoolId,
        role: user.role,
        email,
        matchScore: check.score,
        matchedFields: check.matchedFields,
        mismatchFields: check.mismatchFields,
      },
    };
  }

  const note = (input.note ?? "").trim().slice(0, 500) || null;

  const created = await prisma.$transaction(async (tx) => {
    // Tutup pengajuan PENDING lama agar tidak ada dua pengajuan aktif.
    if (pending) {
      await tx.passwordResetRequest.update({
        where: { id: pending.id },
        data: { status: "REJECTED", rejectReason: "Digantikan pengajuan terbaru" },
      });
    }
    return tx.passwordResetRequest.create({
      data: {
        userId: user.id,
        name,
        email,
        role: user.role,
        schoolName: input.schoolName?.trim() || user.school?.name || null,
        schoolId: user.schoolId,
        educationLevel: (input.educationLevel?.trim() || user.educationLevel) as never,
        classLevel: input.classLevel?.trim() || user.classLevel,
        major: input.major?.trim() || user.major,
        subject: input.subject?.trim() || user.subject,
        policeLevel: (input.policeLevel?.trim() || user.policeLevel) as never,
        policeUnit: input.policeUnit?.trim() || user.policeUnit,
        policeDivision: input.policeDivision?.trim() || user.policeDivision,
        note,
        verified: check.verified,
        matchScore: check.score,
        matchedFields: check.matchedFields as Prisma.InputJsonValue,
        mismatchFields: check.mismatchFields as Prisma.InputJsonValue,
      },
    });
  });

  return {
    success: true,
    requestId: created.id,
    status: created.status,
    verified: created.verified,
    message:
      "Pengajuan reset password berhasil dikirim. Admin akan memverifikasi identitas Anda, lalu mengatur password baru. Anda dapat login kembali memakai password baru tersebut tanpa kehilangan data.",
    audit: {
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      email,
      matchScore: check.score,
      matchedFields: check.matchedFields,
      mismatchFields: check.mismatchFields,
    },
  };
}

/**
 * Setel password baru untuk pengajuan yang valid.
 * Hanya berjalan bila pengajuan PENDING & identitas terverifikasi. Bila gagal,
 * pengajuan tetap PENDING sehingga tidak pernah hilang.
 */
export async function completePasswordReset(params: {
  requestId: string;
  adminId: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<PasswordRequestResult> {
  const request = await prisma.passwordResetRequest.findUnique({
    where: { id: params.requestId },
    include: { user: { include: { school: { select: { name: true } } } } },
  });
  if (!request) return { error: "Pengajuan tidak ditemukan." };
  if (request.status !== "PENDING") return { error: "Pengajuan ini sudah diproses." };
  if (!request.verified) {
    return {
      error:
        "Identitas pengajuan belum terverifikasi. Periksa kembali data pengguna sebelum mengatur ulang password.",
    };
  }
  if (request.user.deletedAt) {
    return { error: "Akun pengguna sudah diarsipkan. Pulihkan akun terlebih dahulu." };
  }

  const strengthError = validatePasswordStrength(
    params.newPassword,
    params.confirmPassword,
    request.user.phone
  );
  if (strengthError) return { error: strengthError };

  const changedAt = new Date();
  const newHash = await hashPassword(params.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: request.userId },
      data: {
        passwordHash: newHash,
        status: request.user.status === "PENDING" ? "ACTIVE" : request.user.status,
        verifiedAt: request.user.verifiedAt ?? changedAt,
      },
    }),
    prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", handledById: params.adminId, handledAt: changedAt },
    }),
    // Cabut sesi aktif agar perangkat lama harus login ulang.
    prisma.userSession.deleteMany({ where: { userId: request.userId } }),
  ]);

  return {
    success: true,
    message: `Password ${request.user.name} berhasil diperbarui. Sampaikan password baru kepada pengguna.`,
    audit: {
      userId: request.userId,
      schoolId: request.user.schoolId,
      role: request.user.role,
      email: request.user.email,
      name: request.user.name,
      schoolName: request.user.school?.name ?? request.schoolName,
      changedAt: changedAt.toISOString(),
    },
  };
}

/** Tolak pengajuan yang menunggu. */
export async function rejectPasswordRequest(params: {
  requestId: string;
  adminId: string;
  reason: string;
}): Promise<PasswordRequestResult> {
  const request = await prisma.passwordResetRequest.findUnique({ where: { id: params.requestId } });
  if (!request) return { error: "Pengajuan tidak ditemukan." };
  if (request.status !== "PENDING") return { error: "Pengajuan ini sudah diproses." };

  const reason = params.reason.trim().slice(0, 300) || "Identitas tidak dapat diverifikasi";
  await prisma.passwordResetRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      handledById: params.adminId,
      handledAt: new Date(),
      rejectReason: reason,
    },
  });

  return {
    success: true,
    message: "Pengajuan ditolak.",
    audit: { userId: request.userId, schoolId: request.schoolId, email: request.email },
  };
}

/** Hapus permanen riwayat pengajuan yang sudah diproses. */
export async function deletePasswordRequest(params: {
  requestId: string;
}): Promise<PasswordRequestResult> {
  const request = await prisma.passwordResetRequest.findUnique({ where: { id: params.requestId } });
  if (!request) return { error: "Pengajuan tidak ditemukan." };
  if (request.status === "PENDING") {
    return { error: "Tolak atau proses pengajuan sebelum menghapusnya." };
  }

  await prisma.passwordResetRequest.delete({ where: { id: request.id } });
  return {
    success: true,
    message: "Riwayat pengajuan dihapus.",
    audit: { userId: request.userId, schoolId: request.schoolId, email: request.email },
  };
}

/**
 * Ubah password mandiri (semua aktor). Wajib memverifikasi password lama.
 * Sesi lain dicabut agar perangkat lama tidak memakai password lama.
 */
export async function changeUserPassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<PasswordRequestResult> {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user || user.deletedAt) return { error: "Pengguna tidak ditemukan." };

  if (!params.currentPassword) return { error: "Masukkan password saat ini." };
  if (!(await verifyPassword(params.currentPassword, user.passwordHash))) {
    return { error: "Password saat ini salah." };
  }
  if (await verifyPassword(params.newPassword, user.passwordHash)) {
    return { error: "Password baru tidak boleh sama dengan password saat ini." };
  }
  const strengthError = validatePasswordStrength(
    params.newPassword,
    params.confirmPassword,
    user.phone
  );
  if (strengthError) return { error: strengthError };

  const changedAt = new Date();
  const newHash = await hashPassword(params.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return {
    success: true,
    message: "Password berhasil diperbarui.",
    audit: {
      userId: user.id,
      schoolId: user.schoolId,
      email: user.email,
      name: user.name,
      changedAt: changedAt.toISOString(),
    },
  };
}
