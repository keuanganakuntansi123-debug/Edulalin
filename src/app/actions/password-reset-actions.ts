"use server";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { getRequestMeta, safeRevalidatePath } from "@/lib/request-context";
import { requireRole } from "@/lib/guards";
import {
  submitPasswordResetRequest,
  completePasswordReset,
  rejectPasswordRequest as rejectRequest,
  deletePasswordRequest as deleteRequest,
  changeUserPassword,
  type PasswordRequestResult,
} from "@/lib/password-reset-service";

/**
 * Alur Lupa Password EDULALIN — pengajuan reset melalui Admin.
 *
 * Pengguna mengirim identitas dari `/lupa-password`. Sistem memverifikasi
 * kecocokan dengan akun asli, membuat pengajuan yang muncul di dashboard
 * Admin, lalu Admin menyetel password baru. Tidak ada ketergantungan OTP
 * email/SMTP pada alur ini.
 *
 * Logika inti ada di `@/lib/password-reset-service` agar dapat diuji langsung
 * terhadap database; lapisan ini menambahkan otorisasi, audit, dan revalidasi.
 */

export type PasswordRequestState = PasswordRequestResult;

function clean(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

/** Buat notifikasi untuk seluruh Admin aktif (in-app bell). */
async function notifyAdmins(params: {
  requestId: string;
  name: string;
  email: string;
  role: string;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  try {
    await prisma.$transaction(
      admins.map((a) =>
        prisma.notification.create({
          data: {
            recipientId: a.id,
            type: "PASSWORD_RESET_REQUEST",
            title: "Pengajuan Lupa Password Baru",
            body: `${params.name} (${params.email}) — ${params.role} mengajukan reset password.`,
            link: "/dashboard/admin/password-requests",
          },
        })
      )
    );
  } catch (e) {
    await logActivity({
      action: "PASSWORD_REQUEST_NOTIFY_FAILED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: params.requestId,
      metadata: { error: e instanceof Error ? e.message : String(e) },
    }).catch(() => undefined);
  }
}

/** Kirim pengajuan reset password (halaman publik). */
export async function requestPasswordReset(
  _prev: PasswordRequestState | undefined,
  formData: FormData
): Promise<PasswordRequestState> {
  const result = await submitPasswordResetRequest({
    email: clean(formData.get("email")),
    name: clean(formData.get("name")),
    schoolName: clean(formData.get("schoolName")),
    educationLevel: clean(formData.get("educationLevel")),
    classLevel: clean(formData.get("classLevel")),
    major: clean(formData.get("major")),
    subject: clean(formData.get("subject")),
    policeLevel: clean(formData.get("policeLevel")),
    policeUnit: clean(formData.get("policeUnit")),
    policeDivision: clean(formData.get("policeDivision")),
    note: clean(formData.get("note")),
  });

  if (result.success && result.requestId) {
    const meta = await getRequestMeta();
    logActivity({
      actorId: result.audit?.userId,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_SUBMITTED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: result.requestId,
      metadata: {
        email: result.audit?.email,
        role: result.audit?.role,
        verified: result.verified,
        score: result.audit?.matchScore,
        matched: result.audit?.matchedFields,
        mismatch: result.audit?.mismatchFields,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);

    await notifyAdmins({
      requestId: result.requestId,
      name: clean(formData.get("name")),
      email: result.audit?.email ?? clean(formData.get("email")),
      role: result.audit?.role ?? "-",
    });
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** ADMIN-only — setel password baru untuk pengajuan valid. */
export async function resetPasswordByRequest(
  requestId: string,
  formData: FormData
): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (result.success) {
    const meta = await getRequestMeta();
    logActivity({
      actorId: admin.id,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_COMPLETED_BY_ADMIN",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: {
        targetUserId: result.audit?.userId,
        targetEmail: result.audit?.email,
        targetRole: result.audit?.role,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** ADMIN-only — tolak pengajuan. */
export async function rejectPasswordRequest(
  requestId: string,
  reason: string
): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await rejectRequest({ requestId, adminId: admin.id, reason });

  if (result.success) {
    logActivity({
      actorId: admin.id,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_REJECTED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: { reason },
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** ADMIN-only — hapus riwayat pengajuan yang sudah diproses. */
export async function deletePasswordRequest(requestId: string): Promise<PasswordRequestState> {
  const admin = await requireRole("ADMIN");
  const result = await deleteRequest({ requestId });

  if (result.success) {
    logActivity({
      actorId: admin.id,
      schoolId: result.audit?.schoolId,
      action: "PASSWORD_RESET_REQUEST_DELETED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: requestId,
      metadata: { email: result.audit?.email },
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard/admin/password-requests");
  }

  return result;
}

/** Ubah password mandiri (semua aktor) dari menu Profil & Pengaturan. */
export async function changeOwnPassword(
  _prev: PasswordRequestState | undefined,
  formData: FormData
): Promise<PasswordRequestState> {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const result = await changeUserPassword({
    userId: user.id,
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (result.success) {
    const meta = await getRequestMeta();
    logActivity({
      actorId: user.id,
      schoolId: user.schoolId,
      action: "PASSWORD_CHANGED_BY_USER",
      entity: "USER",
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }).catch(() => undefined);
    safeRevalidatePath("/dashboard", "layout");
  }

  return result;
}
