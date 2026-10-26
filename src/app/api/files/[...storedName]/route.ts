import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getStoredFilePath, readStoredBuffer } from "@/lib/storage";
import { isBlobPathname, streamBlob } from "@/lib/blob-storage";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

/**
 * Serve file yang tersimpan. Akses dibatasi:
 * - Modul: murid/guru/admin dari sekolah tujuan atau global
 * - PDF kuis: admin saja
 * - Avatar: user itu sendiri, atau admin, atau siapa saja yang terautentikasi sesuai relasi konten
 * - School logo: publik (pratinjau kartu & beranda)
 *
 * Catch-all (`[...storedName]`) karena pathname blob dapat berisi folder
 * (mis. `logos/xxx.png`), bukan hanya UUID lokal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storedName: string[] }> }
) {
  const { storedName: segments } = await params;
  const storedName = segments.join("/");
  const record = await prisma.uploadedFile.findUnique({ where: { storedName } });
  if (!record) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });

  // Thumbnail modul & gambar konten publik (SITE_IMAGE / ARTICLE_IMAGE) boleh
  // diakses siapa saja tanpa login. Konten materi (MODULE_CONTENT) & file lain
  // tetap memerlukan autentikasi + otorisasi.
  // Thumbnail modul (kind khusus MODULE_THUMBNAIL, atau file yang direferensikan
  // sebagai thumbnail modul) dapat dibaca tanpa login agar pratinjau kartu
  // materi tetap tampil di katalog publik.
  const isPublicThumbnail =
    record.kind === "MODULE_THUMBNAIL" || (await isModuleThumbnail(record.id));
  const isSchoolLogo =
    record.kind === "SCHOOL_LOGO" &&
    Boolean(await prisma.school.findFirst({ where: { logoFileId: record.id }, select: { id: true } }));
  if (
    record.kind !== "SITE_IMAGE" &&
    record.kind !== "ARTICLE_IMAGE" &&
    !isPublicThumbnail &&
    !isSchoolLogo
  ) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const allow = await canAccessFile(user, record);
    if (!allow) return NextResponse.json({ error: "Tidak memiliki akses ke file ini" }, { status: 403 });
  }

  const isVideo =
    record.mimeType.startsWith("video/") ||
    ["mp4", "webm", "mov"].includes(path.extname(storedName).toLowerCase().replace(".", ""));
  const rangeHeader = isVideo ? req.headers.get("range") : null;

  const isBlob = isBlobPathname(storedName);
  if (isBlob) {
    // File tersimpan di Vercel Blob — alirkan dari object storage.
    const blob = await streamBlob(storedName);
    if (!blob) {
      return NextResponse.json({ error: "File tidak ditemukan di penyimpanan" }, { status: 404 });
    }
    const headers = new Headers();
    headers.set("Content-Type", blob.contentType || record.mimeType);
    headers.set("Content-Length", String(blob.size));
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");
    if (!blob.contentType.startsWith("video/")) {
      headers.set(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(record.originalName)}"`
      );
    }
    // Video (privasi + ukuran besar): server memakainya sebagai proxy streaming.
    // Untuk permintaan rentang (seek), muat byte yang diminta dan balas 206
    // agar pemutar video dapat melompat tanpa mengunduh seluruh berkas.
    if (isVideo && rangeHeader) {
      const buffer = await readStoredBuffer(storedName);
      if (!buffer) {
        return NextResponse.json({ error: "File tidak ditemukan di penyimpanan" }, { status: 404 });
      }
      return rangeResponse(buffer, record.mimeType, record.originalName, rangeHeader, headers);
    }
    // Video tanpa Range juga diproksikan sebagai 206 sebagian agar pemutar
    // dapat melakukan seek walau server tidak mendukung byte range penuh.
    if (isVideo) {
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(blob.size));
      return new NextResponse(blob.stream, { status: 206, headers });
    }
    return new NextResponse(blob.stream, { status: 200, headers });
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

  if (isVideo && rangeHeader) {
    return rangeResponse(data, record.mimeType, record.originalName, rangeHeader, headers);
  }

  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}

/** Balas sebagian byte untuk permintaan Range (206) atau 416 bila tidak valid. */
function rangeResponse(
  data: Uint8Array,
  contentType: string,
  originalName: string,
  rangeHeader: string,
  baseHeaders: Headers
): NextResponse {
  const size = data.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || size === 0) {
    const headers = new Headers(baseHeaders);
    headers.set("Content-Range", `bytes */${size}`);
    return new NextResponse(null, { status: 416, headers });
  }
  const [, startRaw, endRaw] = match;
  let start = startRaw ? Number(startRaw) : 0;
  let end = endRaw ? Number(endRaw) : size - 1;
  if (!startRaw && endRaw) {
    // Suffix range: bytes=-500 → 500 byte terakhir.
    start = Math.max(0, size - Number(endRaw));
    end = size - 1;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    const headers = new Headers(baseHeaders);
    headers.set("Content-Range", `bytes */${size}`);
    return new NextResponse(null, { status: 416, headers });
  }
  end = Math.min(end, size - 1);
  const chunk = data.subarray(start, end + 1);
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(chunk.byteLength));
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Accept-Ranges", "bytes");
  headers.set(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(originalName)}"`
  );
  return new NextResponse(new Uint8Array(chunk), { status: 206, headers });
}

type UploadedFileRow = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  kind:
    | "MODULE_CONTENT"
    | "MODULE_THUMBNAIL"
    | "QUIZ_PDF"
    | "AVATAR"
    | "SITE_IMAGE"
    | "SCHOOL_LOGO"
    | "ARTICLE_IMAGE";
  ownerId: string;
  moduleContentId?: string | null;
  moduleThumbnailId?: string | null;
  quizSourceId?: string | null;
};

/** Cek apakah file dipakai sebagai thumbnail modul (pratinjau publik). */
async function isModuleThumbnail(fileId: string): Promise<boolean> {
  const mod = await prisma.module.findFirst({
    where: { thumbnailFileId: fileId, deletedAt: null },
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
            if (
              user.educationLevel !== "SMA" &&
              user.educationLevel !== "SMK" &&
              user.educationLevel !== "SIM"
            ) {
              return false;
            }
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