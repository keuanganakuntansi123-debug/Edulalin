"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateOtp, sendMail } from "@/lib/mail";
import { logActivity } from "@/lib/audit";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/** Masa berlaku OTP: 5 menit. */
const OTP_TTL_MS = 5 * 60 * 1000;
/** Jeda minimal pengiriman ulang OTP (detik). */
const RESEND_COOLDOWN_S = 60;
/** Batas maksimal percobaan verifikasi OTP salah. */
const MAX_VERIFY_ATTEMPTS = 5;

export type ForgotPasswordState = {
  step?: "request" | "verify" | "reset";
  email?: string;
  otp?: string;
  message?: string;
  error?: string;
  success?: boolean;
  resendIn?: number;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const shown = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${shown}***@${domain}`;
}

/** Langkah 1 — kirim OTP ke email terdaftar. */
export async function requestOtp(
  _prev: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.status === "INACTIVE" || user.status === "PENDING") {
    return { error: "Email tidak terdaftar di EDULALIN." };
  }

  // Cegah pengiriman berulang dalam waktu singkat.
  const recent = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: "PASSWORD_RESET_OTP",
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_S * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const wait = Math.max(
      1,
      Math.ceil((recent.createdAt.getTime() + RESEND_COOLDOWN_S * 1000 - Date.now()) / 1000)
    );
    return { error: `Mohon tunggu ${wait} detik sebelum mengirim ulang kode.` };
  }

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);

  // Nonaktifkan OTP lama user (single-use), lalu buat yang baru.
  await prisma.$transaction([
    prisma.verificationToken.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET_OTP", usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET_OTP",
        token: otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0,
      },
    }),
  ]);

  const reqHeaders = await headers();
  const mail = await sendMail({
    to: user.email,
    subject: "Kode OTP Reset Password EDULALIN",
    text: `Halo ${user.name},

Anda meminta reset password akun EDULALIN. Gunakan kode OTP berikut untuk melanjutkan:

Kode OTP: ${otp}

Kode berlaku selama 5 menit dan hanya dapat digunakan sekali.
Jika Anda tidak meminta reset password, abaikan email ini.

— Tim EDULALIN`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1d4ed8;margin:0 0 8px;">Reset Password EDULALIN</h2>
        <p style="color:#334155;line-height:1.6;">Halo <strong>${user.name}</strong>,<br/>Anda meminta reset password akun EDULALIN. Gunakan kode berikut untuk melanjutkan:</p>
        <div style="margin:20px 0;text-align:center;">
          <span style="display:inline-block;padding:14px 28px;font-size:28px;font-weight:800;letter-spacing:6px;color:#1d4ed8;background:#eff6ff;border-radius:10px;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">Kode berlaku selama <strong>5 menit</strong> dan hanya dapat digunakan <strong>satu kali</strong>. Jika Anda tidak meminta reset password, abaikan email ini.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px;">— Tim EDULALIN · Edukasi Lalu Lintas</p>
      </div>`,
  });

  if (!mail.ok) {
    // Email gagal terkirim — hapus OTP yang baru dibuat agar percobaan
    // berikutnya tidak terblokir oleh cooldown 60 detik.
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: "PASSWORD_RESET_OTP", usedAt: null },
    });
    logActivity({
      actorId: user.id,
      schoolId: user.schoolId,
      action: "PASSWORD_RESET_MAIL_FAILED",
      entity: "USER",
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: reqHeaders.get("x-forwarded-for"),
      userAgent: reqHeaders.get("user-agent"),
    }).catch(() => undefined);
    return { error: `Gagal mengirim email: ${mail.error}. Periksa konfigurasi SMTP.` };
  }

  logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PASSWORD_RESET_REQUESTED",
    entity: "USER",
    entityId: user.id,
    metadata: { email: user.email },
    ipAddress: reqHeaders.get("x-forwarded-for"),
    userAgent: reqHeaders.get("user-agent"),
  }).catch(() => undefined);

  return {
    step: "verify",
    email: user.email,
    success: true,
    message: `Kode OTP telah dikirim ke ${maskEmail(user.email)}.`,
    resendIn: RESEND_COOLDOWN_S,
  };
}

/** Langkah 2 — verifikasi OTP. */
export async function verifyOtp(
  _prev: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();

  if (!/^\d{6}$/.test(otp)) {
    return { step: "verify", email, error: "Kode OTP harus 6 digit angka." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.status === "INACTIVE") {
    return { error: "Email tidak terdaftar di EDULALIN." };
  }

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: "PASSWORD_RESET_OTP",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!token) {
    return { step: "verify", email, error: "Kode OTP tidak ditemukan atau sudah kedaluwarsa. Kirim ulang kode." };
  }

  // Batasi percobaan salah.
  if ((token.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return { step: "verify", email, error: "Terlalu banyak percobaan. Kirim ulang kode OTP." };
  }

  const { verifyPassword } = await import("@/lib/password");
  const ok = await verifyPassword(otp, token.token);
  if (!ok) {
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { step: "verify", email, error: "Kode OTP salah. Periksa kembali atau kirim ulang kode." };
  }

  // OTP benar — tandai terpakai (single-use).
  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  const reqHeaders = await headers();
  logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PASSWORD_RESET_OTP_VERIFIED",
    entity: "USER",
    entityId: user.id,
    ipAddress: reqHeaders.get("x-forwarded-for"),
    userAgent: reqHeaders.get("user-agent"),
  }).catch(() => undefined);

  return { step: "reset", email: user.email, success: true };
}

/** Langkah 3 — simpan password baru (hash aman). */
export async function resetPassword(
  _prev: ForgotPasswordState | undefined,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { step: "reset", email, otp, error: "Password baru minimal 8 karakter." };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { step: "reset", email, otp, error: "Password baru wajib mengandung huruf dan angka." };
  }
  if (password !== confirmPassword) {
    return { step: "reset", email, otp, error: "Konfirmasi password tidak sama." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.status === "INACTIVE") {
    return { error: "Email tidak terdaftar di EDULALIN." };
  }

  // Pastikan OTP yang sama sudah diverifikasi (usedAt terisi, tidak kedaluwarsa).
  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: "PASSWORD_RESET_OTP",
      usedAt: { not: null },
      createdAt: { gt: new Date(Date.now() - OTP_TTL_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!token) {
    return { error: "Sesi verifikasi tidak valid. Silakan ulangi dari awal." };
  }

  const newHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, status: "ACTIVE", verifiedAt: new Date() },
    }),
    // Nonaktifkan semua OTP reset password user (sekali pakai).
    prisma.verificationToken.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET_OTP", usedAt: null },
      data: { usedAt: new Date() },
    }),
    // Cabut semua sesi aktif agar login lama harus pakai password baru.
    prisma.userSession.deleteMany({ where: { userId: user.id } }),
  ]);

  const reqHeaders = await headers();
  logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "USER",
    entityId: user.id,
    ipAddress: reqHeaders.get("x-forwarded-for"),
    userAgent: reqHeaders.get("user-agent"),
  }).catch(() => undefined);

  revalidatePath("/dashboard", "layout");
  return {
    success: true,
    message: "Password berhasil diperbarui. Silakan masuk dengan password baru.",
  };
}
