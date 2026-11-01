import type { FileKind } from "@/generated/prisma/client";

export const MB = 1024 * 1024;

/**
 * Batas unggahan mengikuti batas infrastruktur penyimpanan (Vercel Blob),
 * BUKAN batas aplikasi. Vercel Blob menerima satu berkas hingga 500 MB per
 * unggahan (mode multipart otomatis untuk berkas besar). Nilai ini menjadi
 * batas aman sehingga validasi klien memberi pesan jelas sebelum menyentuh
 * jaringan, dan server hanya menolak berkas yang benar-benar melewati
 * kapasitas layanan penyimpanan.
 *
 * Tidak ada lagi batas per jenis file — PDF berukuran besar, video, dokumen,
 * gambar, dan tautan semuanya didukung selama berada di bawah kapasitas Blob.
 */
export const UPLOAD_LIMIT_BYTES = 500 * MB;
export const UPLOAD_LIMIT_LABEL = "500 MB";

/** Ambang multipart unggahan Blob (di atas ini diunggah bertahap/chunk). */
export const MULTIPART_THRESHOLD_BYTES = 5 * MB;

/** Label batas ukuran unggahan untuk ditampilkan di UI. */
export function maxSizeLabel(): string {
  return UPLOAD_LIMIT_LABEL;
}

/** Format ukuran byte menjadi label ringkas (KB/MB/GB). */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Validasi tipe & ukuran berkas untuk sebuah jenis unggahan.
 * Mengembalikan pesan error (string) atau null bila valid.
 */
export function validateUpload(kind: FileKind, mime: string, size: number): string | null {
  const type = mime || "application/octet-stream";
  if (!ALLOWED_MIME[kind].includes(type)) {
    return `Tipe file tidak diizinkan (${type}). Gunakan ${ALLOWED_MIME[kind].join(", ")}.`;
  }
  if (size > UPLOAD_LIMIT_BYTES) {
    return `Ukuran file melebihi kapasitas penyimpanan ${UPLOAD_LIMIT_LABEL}.`;
  }
  return null;
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
  MODULE_THUMBNAIL: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
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
  MODULE_THUMBNAIL: "thumbnails",
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
