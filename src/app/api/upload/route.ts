import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/storage";
import { logActivity } from "@/lib/audit";
import { isAllowedMime, MAX_SIZES } from "@/lib/storage";
import type { FileKind } from "@/generated/prisma/client";

export const instant = false;

const KINDS: FileKind[] = ["MODULE_CONTENT", "QUIZ_PDF", "AVATAR", "SITE_IMAGE", "SCHOOL_LOGO"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  if (user.role !== "ADMIN" && user.role !== "GURU" && user.role !== "POLISI" && user.role !== "MURID") {
    return NextResponse.json({ error: "Tidak memiliki izin mengunggah" }, { status: 403 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (!KINDS.includes(kind as FileKind)) {
    return NextResponse.json({ error: "Jenis file tidak valid" }, { status: 400 });
  }
  if (kind === "SITE_IMAGE" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Admin yang dapat mengunggah gambar konten" }, { status: 403 });
  }
  if (kind === "SCHOOL_LOGO" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya Admin yang dapat mengunggah logo sekolah" }, { status: 403 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  const fKind = kind as FileKind;
  // Murid & polisi hanya boleh unggah foto profil
  if ((user.role === "MURID" || user.role === "POLISI") && fKind !== "AVATAR") {
    return NextResponse.json({ error: "Tidak memiliki izin mengunggah tipe file ini" }, { status: 403 });
  }
  // Guru boleh unggah materi modul + foto profil sendiri
  if (user.role === "GURU" && fKind !== "MODULE_CONTENT" && fKind !== "AVATAR") {
    return NextResponse.json({ error: "Tidak memiliki izin mengunggah tipe file ini" }, { status: 403 });
  }
  if (!isAllowedMime(fKind, file.type || "")) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan" }, { status: 400 });
  }
  if (file.size > MAX_SIZES[fKind]) {
    return NextResponse.json({ error: "Ukuran file melebihi batas maksimal" }, { status: 400 });
  }

  try {
    const saved = await saveUploadedFile({ file, kind: fKind, ownerId: user.id });
    logActivity({
      actorId: user.id,
      schoolId: user.schoolId ?? undefined,
      action: "FILE_UPLOAD",
      entity: "FILE",
      entityId: saved.id,
      metadata: { kind: fKind, originalName: saved.originalName },
    }).catch(() => undefined);
    return NextResponse.json({ file: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}