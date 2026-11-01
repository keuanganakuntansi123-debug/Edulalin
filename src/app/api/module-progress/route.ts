import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getModuleForUser, updateModuleProgress } from "@/lib/module-service";
import { logActivity } from "@/lib/audit";

export const instant = false;

/**
 * Endpoint simpan progres membaca terakhir (dipakai saat halaman ditinggalkan
 * lewat `fetch(..., { keepalive: true })`, di mana server action tidak dapat
 * diandalkan). Validasi akses modul tetap dilakukan seperti server action.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "MURID") {
    return NextResponse.json({ error: "Hanya murid yang dapat menyimpan progres" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const moduleId = String(formData.get("moduleId") ?? "");
  const progress = Number(formData.get("progress") ?? 0);
  const pageRaw = formData.get("lastPage");
  const pagesRaw = formData.get("totalPages");
  const lastPage = pageRaw != null && String(pageRaw) !== "" ? Number(pageRaw) : null;
  const totalPages = pagesRaw != null && String(pagesRaw) !== "" ? Number(pagesRaw) : null;

  if (!moduleId || !Number.isFinite(progress)) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const mod = await getModuleForUser({
    moduleId,
    user: {
      id: user.id,
      role: user.role,
      schoolId: user.schoolId,
      educationLevel: user.educationLevel,
      birthDate: user.birthDate,
    },
  });
  if (!mod) return NextResponse.json({ error: "Modul tidak dapat diakses" }, { status: 403 });

  const updated = await updateModuleProgress({
    moduleId,
    userId: user.id,
    progress,
    lastPage,
    totalPages,
  });

  logActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "MODULE_PROGRESS",
    entity: "MODULE",
    entityId: moduleId,
    metadata: {
      progress: updated.progress,
      completed: updated.completed,
      lastPage: updated.lastPage,
      totalPages: updated.totalPages,
      source: "reader-exit",
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, progress: updated.progress });
}
