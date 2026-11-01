"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { normalizeIdentityName, validateSchoolName } from "@/lib/constants";

/**
 * Guru dapat memperbarui data sekolah tempatnya mengajar (nama, alamat,
 * kota, provinsi). Jenjang (educationLevel) TIDAK dapat diubah guru karena
 * perubahan jenjang memengaruhi isolasi konten & validasi prefiks nama.
 * Semua perubahan langsung tersinkron ke Admin (satu sumber data: School).
 */
export async function updateOwnSchool(
  formData: FormData
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireRole("GURU");
  if (!user.schoolId) return { error: "Akun Anda belum terhubung ke sekolah" };

  const school = await prisma.school.findUnique({ where: { id: user.schoolId } });
  if (!school || school.deletedAt) return { error: "Sekolah tidak ditemukan" };

  const nameRaw = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();

  if (nameRaw.length < 3) return { error: "Nama sekolah minimal 3 karakter" };
  if (address.length < 3) return { error: "Alamat minimal 3 karakter" };
  if (city.length < 2) return { error: "Kota minimal 2 karakter" };
  if (province.length < 2) return { error: "Provinsi minimal 2 karakter" };

  // Prefiks nama wajib sesuai jenjang sekolah (N/SDN, SMPN, SMAN, SMKN, dst.).
  const check = validateSchoolName(nameRaw, school.educationLevel);
  if (!check.ok) return { error: check.error ?? "Nama sekolah tidak valid" };

  await prisma.school.update({
    where: { id: school.id },
    data: {
      name: check.normalized,
      address: normalizeIdentityName(address),
      city: normalizeIdentityName(city),
      province: normalizeIdentityName(province),
    },
  });

  logActivity({
    actorId: user.id,
    schoolId: school.id,
    action: "SCHOOL_UPDATE",
    entity: "SCHOOL",
    entityId: school.id,
    metadata: { name: check.normalized, source: "GURU" },
  }).catch(() => undefined);

  // Sinkronkan tampilan ke semua area yang menampilkan identitas sekolah.
  revalidatePath("/dashboard/guru", "layout");
  revalidatePath("/dashboard/admin/schools");
  revalidatePath("/dashboard/murid", "layout");
  revalidatePath("/dashboard/polisi", "layout");
  revalidatePath("/", "layout");
  revalidatePath("/tentang");

  return { ok: true };
}
