"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { removeStoredFile } from "@/lib/storage";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function updateProfile(formData: FormData) {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const avatarFileId = formData.get("avatarFileId") ? String(formData.get("avatarFileId")) : null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const newPassword = String(formData.get("newPassword") ?? "");
  const currentPassword = String(formData.get("currentPassword") ?? "");

  if (name.length < 2) return { error: "Nama minimal 2 karakter" };
  if (!user.id) return { error: "Pengguna tidak ditemukan" };

  const data: {
    name?: string;
    phone?: string | null;
    email?: string;
    passwordHash?: string;
  } = { name, phone };

  // Ubah email (dengan verifikasi password saat ini)
  if (email && email !== user.email) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return { error: "Masukkan password saat ini untuk mengubah email" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return { error: "Email tidak valid" };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) return { error: "Email sudah digunakan akun lain" };
    data.email = email;
  }

  // Ubah password (dengan verifikasi password saat ini)
  if (newPassword) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return { error: "Password saat ini salah" };
    }
    if (newPassword.length < 8) return { error: "Password baru minimal 8 karakter" };
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return { error: "Password baru wajib mengandung huruf dan angka" };
    }
    data.passwordHash = await hashPassword(newPassword);
  }

  const avatarUrl = avatarFileId
    ? await (async () => {
        const file = await prisma.uploadedFile.findUnique({ where: { id: avatarFileId } });
        if (!file || file.kind !== "AVATAR" || file.ownerId !== user.id) return undefined;
        return `/api/files/${file.storedName}`;
      })()
    : undefined;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...data,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  // Hapus avatar lama jika diganti
  if (avatarUrl && user.avatarUrl) {
    const oldStored = user.avatarUrl.split("/").pop();
    if (oldStored && oldStored !== avatarUrl.split("/").pop()) {
      const oldFile = await prisma.uploadedFile.findUnique({ where: { storedName: oldStored } });
      if (oldFile && oldFile.kind === "AVATAR" && oldFile.ownerId === user.id) {
        await removeStoredFile(oldStored);
        await prisma.uploadedFile.delete({ where: { id: oldFile.id } });
      }
    }
  }

  logActivity({
    actorId: user.id,
    schoolId: user.schoolId ?? undefined,
    action: "PROFILE_UPDATE",
    entity: "USER",
    entityId: user.id,
    metadata: { name, hasAvatar: !!avatarUrl },
  }).catch(() => undefined);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function removeAvatar() {
  const user = await requireRole("ADMIN", "GURU", "POLISI", "MURID");
  if (user.avatarUrl) {
    const stored = user.avatarUrl.split("/").pop();
    if (stored) {
      const file = await prisma.uploadedFile.findUnique({ where: { storedName: stored } });
      if (file && file.kind === "AVATAR" && file.ownerId === user.id) {
        await removeStoredFile(stored);
        await prisma.uploadedFile.delete({ where: { id: file.id } });
      }
    }
  }
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}