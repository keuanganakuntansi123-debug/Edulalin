import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { MAX_SIZES, isAllowedMime } from "@/lib/storage";
import { isBlobPathname } from "@/lib/blob-storage";
import { logActivity } from "@/lib/audit";
import type { FileKind } from "@/generated/prisma/client";

export const instant = false;

const KINDS: FileKind[] = ["MODULE_CONTENT", "QUIZ_PDF", "AVATAR", "SITE_IMAGE", "SCHOOL_LOGO"];

/**
 * Catat metadata file yang sudah diunggah ke Vercel Blob ke Neon.
 * Dipanggil oleh client setelah upload blob selesai (FileUpload).
 * `storedName` berisi pathname blob (mis. `modules/xxx.pdf`).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { pathname, originalName, mimeType, size, kind } = (await req.json()) as {
    pathname?: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    kind?: string;
  };

  if (!pathname || !isBlobPathname(pathname)) {
    return NextResponse.json({ error: "pathname blob tidak valid" }, { status: 400 });
  }
  if (!kind || !KINDS.includes(kind as FileKind)) {
    return NextResponse.json({ error: "Jenis file tidak valid" }, { status: 400 });
  }
  const fKind = kind as FileKind;
  const mime = mimeType || "application/octet-stream";
  if (!isAllowedMime(fKind, mime)) {
    return NextResponse.json({ error: "Tipe file tidak diizinkan" }, { status: 400 });
  }
  const numericSize = Number(size || 0);
  if (!Number.isFinite(numericSize) || numericSize <= 0 || numericSize > MAX_SIZES[fKind]) {
    return NextResponse.json({ error: "Ukuran file melebihi batas maksimal 50 MB" }, { status: 400 });
  }

  // Cegah duplikat bila client memanggil register dua kali.
  const existing = await prisma.uploadedFile.findUnique({ where: { storedName: pathname } });
  if (existing) {
    return NextResponse.json({
      file: {
        id: existing.id,
        storedName: existing.storedName,
        url: `/api/files/${encodeURIComponent(existing.storedName)}`,
        originalName: existing.originalName,
        mimeType: existing.mimeType,
        size: existing.size,
      },
    });
  }

  try {
    const record = await prisma.uploadedFile.create({
      data: {
        originalName: originalName || pathname.split("/").pop() || "file",
        storedName: pathname,
        mimeType: mime,
        size: numericSize,
        kind: fKind,
        ownerId: user.id,
      },
    });
    logActivity({
      actorId: user.id,
      schoolId: user.schoolId ?? undefined,
      action: "FILE_UPLOAD",
      entity: "FILE",
      entityId: record.id,
      metadata: { kind: fKind, originalName: record.originalName, storage: "blob" },
    }).catch(() => undefined);
    return NextResponse.json({
      file: {
        id: record.id,
        storedName: record.storedName,
        url: `/api/files/${encodeURIComponent(record.storedName)}`,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menyimpan metadata file" },
      { status: 500 }
    );
  }
}
