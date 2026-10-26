import type { FileKind } from "@/generated/prisma/client";

export const MB = 1024 * 1024;

/** Batas upload maksimal per file (byte). Seluruh jenis file kini 50 MB. */
export const MAX_SIZES: Record<FileKind, number> = {
  MODULE_CONTENT: 50 * MB, // 50 MB (PDF/video/dokumen)
  QUIZ_PDF: 50 * MB, // 50 MB
  AVATAR: 50 * MB, // 50 MB (foto profil)
  SITE_IMAGE: 50 * MB, // 50 MB (gambar konten publik)
  SCHOOL_LOGO: 50 * MB, // 50 MB (logo sekolah)
  ARTICLE_IMAGE: 50 * MB, // 50 MB (gambar berita & edukasi)
};

/** Label batas ukuran per jenis file untuk ditampilkan di UI. */
export function maxSizeLabel(kind: FileKind): string {
  return `${Math.round(MAX_SIZES[kind] / MB)} MB`;
}

/**
 * Batas ukuran yang di-embed sebagai data URI base64 (mis. logo sekolah,
 * avatar, gambar berita). File lebih besar tetap dilayani lewat /api/files
 * agar ukuran baris database tetap terkendali.
 */
export const EMBED_MAX_BYTES = 4 * MB;

export const ALLOWED_MIME: Record<FileKind, string[]> = {
  MODULE_CONTENT: [
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  QUIZ_PDF: ["application/pdf"],
  AVATAR: ["image/jpeg", "image/png", "image/webp"],
  SITE_IMAGE: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  SCHOOL_LOGO: ["image/jpeg", "image/png", "image/webp"],
  ARTICLE_IMAGE: ["image/jpeg", "image/png", "image/webp"],
};

export function isAllowedMime(kind: FileKind, mime: string): boolean {
  return ALLOWED_MIME[kind].includes(mime);
}

/** Prefix folder per jenis file (client & server — aman diimpor bersama). */
export const BLOB_PREFIX: Record<FileKind, string> = {
  MODULE_CONTENT: "modules",
  QUIZ_PDF: "quiz",
  AVATAR: "avatars",
  SITE_IMAGE: "site",
  SCHOOL_LOGO: "logos",
  ARTICLE_IMAGE: "articles",
};

/**
 * Buat pathname blob yang aman & unik dari nama file asli.
 * Dipakai oleh upload client (FileUpload) dan fallback server (storage.ts)
 * supaya pathname selalu valid (mengandung '/') dan tidak bentrok.
 */
export function blobPathname(kind: FileKind, fileName: string): string {
  const prefix = BLOB_PREFIX[kind];
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}/${stamp}-${safe}`;
}
