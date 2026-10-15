import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getStoredFilePath } from "@/lib/storage";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

/**
 * Serve file yang tersimpan. Akses dibatasi:
 * - Modul: murid/guru/admin dari sekolah tujuan atau global
 * - PDF kuis: admin saja
 * - Avatar: user itu sendiri, atau admin, atau siapa saja yang terautentikasi sesuai relasi konten
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storedName: string }> }
) {
  const { storedName } = await params;
  const record = await prisma.uploadedFile.findUnique({ where: { storedName } });
  if (!record) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });

  // Thumbnail modul & gambar konten publik boleh diakses siapa saja (pratinjau).
  // Konten materi (MODULE_CONTENT) & file lain tetap memerlukan autentikasi + otorisasi.
  const isPublicThumbnail = await isModuleThumbnail(record.id);
  if (record.kind !== "SITE_IMAGE" && !isPublicThumbnail) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const allow = await canAccessFile(user, record);
    if (!allow) return NextResponse.json({ error: "Tidak memiliki akses ke file ini" }, { status: 403 });
  }

  const filePath = await getStoredFilePath(storedName);
  if (!filePath) return NextResponse.json({ error: "File tidak ditemukan di server" }, { status: 404 });

  const data = await fs.readFile(filePath);
  const headers = new Headers();
  headers.set("Content-Type", record.mimeType);
  headers.set("Content-Length", String(data.byteLength));
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  const ext = path.extname(storedName).toLowerCase();
  if (["mp4", "webm", "mov"].includes(ext) || record.mimeType.startsWith("video/")) {
    headers.set("Accept-Ranges", "bytes");
  }
  if (!record.mimeType.startsWith("video/")) {
    headers.set(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(record.originalName)}"`
    );
  }

  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}

type UploadedFileRow = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  kind: "MODULE_CONTENT" | "QUIZ_PDF" | "AVATAR" | "SITE_IMAGE";
  ownerId: string;
  moduleContentId?: string | null;
  moduleThumbnailId?: string | null;
  quizSourceId?: string | null;
};

/** Cek apakah file dipakai sebagai thumbnail modul (pratinjau publik). */
async function isModuleThumbnail(fileId: string): Promise<boolean> {
  const mod = await prisma.module.findFirst({
    where: {
      thumbnailFileId: fileId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return Boolean(mod);
}

async function canAccessFile(
  user: {
    id: string;
    role: string;
    schoolId: string | null;
    educationLevel: string | null;
    classLevel: string | null;
    birthDate: Date | null;
  },
  record: UploadedFileRow
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (record.kind === "AVATAR") return record.ownerId === user.id;

  // MODULE_CONTENT: cek modul yang memakai file ini
  const moduleRef = await prisma.module.findFirst({
    where: {
      OR: [{ contentFileId: record.id }, { thumbnailFileId: record.id }],
      deletedAt: null,
      status: "ACTIVE",
    },
    include: { moduleToSchools: { select: { schoolId: true } } },
  });

  if (moduleRef) {
    // POLISI & GURU dapat melihat materi (termasuk SIM) sesuai kewenangan monitoring/sekolah.
    if (user.role === "POLISI" || user.role === "GURU" || user.role === "MURID") {
      // Konten global bisa diakses semua; konten sekolah harus match
      if (moduleRef.schoolId != null && moduleRef.schoolId !== user.schoolId) return false;
      if (
        moduleRef.moduleToSchools.length > 0 &&
        !moduleRef.moduleToSchools.some((s) => s.schoolId === user.schoolId)
      ) {
        return false;
      }
      // Jenjang/kelas (untuk murid)
      if (user.role === "MURID") {
        if (user.educationLevel) {
          const isSimModule = moduleRef.educationLevel === "SIM";
          if (isSimModule) {
            // Modul SIM tergabung dalam SMA/SMK — hanya murid SMA/SMK, usia >= 17.
            if (user.educationLevel !== "SMA" && user.educationLevel !== "SIM") return false;
            if (!user.birthDate) return false;
            const age = Math.floor((Date.now() - user.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 17) return false;
          } else if (moduleRef.educationLevel !== user.educationLevel) {
            return false;
          }
        }
        if (user.classLevel && moduleRef.classLevel && moduleRef.classLevel !== user.classLevel) return false;
      }
      return true;
    }
    return false;
  }

  // QUIZ_PDF: hanya admin
  if (record.kind === "QUIZ_PDF") return false;

  return false;
}