import type { FileKind } from "@/generated/prisma/client";

export const MB = 1024 * 1024;

/** Batas upload maksimal per file (byte). Seluruh jenis file kini 50 MB. */
export const MAX_SIZES: Record<FileKind, number> = {
  MODULE_CONTENT: 50 * MB, // 50 MB (PDF/video/dokumen)
  QUIZ_PDF: 50 * MB, // 50 MB
  AVATAR: 50 * MB, // 50 MB (foto profil)
  SITE_IMAGE: 50 * MB, // 50 MB (gambar konten publik)
  SCHOOL_LOGO: 50 * MB, // 50 MB (logo sekolah)
};

/** Label batas ukuran per jenis file untuk ditampilkan di UI. */
export function maxSizeLabel(kind: FileKind): string {
  return `${Math.round(MAX_SIZES[kind] / MB)} MB`;
}

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
};

export function isAllowedMime(kind: FileKind, mime: string): boolean {
  return ALLOWED_MIME[kind].includes(mime);
}
