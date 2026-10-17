import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { FileKind } from "@/generated/prisma/client";

const DEFAULT_STORAGE_DIR =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "storage")
    : path.join(process.cwd(), "storage");

const STORAGE_DIR = process.env.STORAGE_DIR ?? DEFAULT_STORAGE_DIR;

/**
 * Akses filesystem lokal. Lokasi dinamis (env), jadi Turbopack melacak
 * seluruh proyek — opt out dipakai supaya build tidak degradasi.
 * Akses selalu dibatasi ke subfolder storage (basename sanitasi).
 */
const storagePath = (name: string): string =>
  path.join(/* turbopackIgnore: true */ STORAGE_DIR, name);

/** Maksimal ukuran per jenis file (byte). */
export const MAX_SIZES: Record<FileKind, number> = {
  MODULE_CONTENT: 200 * 1024 * 1024, // 200 MB (PDF/video/dokumen)
  QUIZ_PDF: 20 * 1024 * 1024, // 20 MB
  AVATAR: 5 * 1024 * 1024, // 5 MB
  SITE_IMAGE: 5 * 1024 * 1024, // 5 MB (gambar konten publik)
  SCHOOL_LOGO: 2 * 1024 * 1024, // 2 MB
};

const ALLOWED_MIME: Record<FileKind, string[]> = {
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

export function ensureStoredDir() {
  return fs.mkdir(STORAGE_DIR, { recursive: true });
}

function extFor(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/zip": ".zip",
    "text/plain": ".txt",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return map[mime] ?? ".bin";
}

export function isAllowedMime(kind: FileKind, mime: string): boolean {
  return ALLOWED_MIME[kind].includes(mime);
}

/**
 * Simpan file ke storage lokal + catat metadata di tabel UploadedFile.
 * Mengembalikan record UploadedFile yang sudah dibuat.
 */
export async function saveUploadedFile(input: {
  file: File;
  kind: FileKind;
  ownerId: string;
}): Promise<{
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  embedded?: string;
}> {
  const { file, kind, ownerId } = input;
  const mime = file.type || "application/octet-stream";
  if (!isAllowedMime(kind, mime)) {
    throw new Error(`Tipe file tidak diizinkan untuk ${kind.toLowerCase()}`);
  }
  if (file.size > MAX_SIZES[kind]) {
    throw new Error("Ukuran file melebihi batas maksimal");
  }

  await ensureStoredDir();
  const storedName = `${crypto.randomUUID()}${extFor(mime)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath(storedName), buffer);

  const record = await prisma.uploadedFile.create({
    data: {
      originalName: file.name,
      storedName,
      mimeType: mime,
      size: file.size,
      kind,
      ownerId,
    },
  });

  const result: {
    id: string;
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
    embedded?: string;
  } = {
    id: record.id,
    url: `/api/files/${storedName}`,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
  };
  // Avatar: embiada base64 supaya foto tetap tersimpan saat redeploy
  // (storage serverless /tmp dapat berubah). Hanya untuk gambar profil kecil.
  if (kind === "AVATAR") {
    result.embedded = `data:${mime};base64,${buffer.toString("base64")}`;
  }
  return result;
}

export async function getStoredFilePath(storedName: string): Promise<string | null> {
  const safe = path.basename(storedName);
  const full = storagePath(safe);
  try {
    await fs.access(full);
    return full;
  } catch {
    return null;
  }
}

export async function removeStoredFile(storedName: string): Promise<void> {
  const safe = path.basename(storedName);
  try {
    await fs.unlink(storagePath(safe));
  } catch {
    // file tidak ada — abaikan
  }
}

export function fileUrl(storedName: string): string {
  return `/api/files/${encodeURIComponent(storedName)}`;
}