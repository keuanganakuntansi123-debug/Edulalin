import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { FileKind } from "@/generated/prisma/client";
import { EMBED_MAX_BYTES, MAX_SIZES, isAllowedMime } from "@/lib/upload-config";
import { isBlobPathname } from "@/lib/blob-storage";
export { EMBED_MAX_BYTES, MAX_SIZES, maxSizeLabel, isAllowedMime } from "@/lib/upload-config";

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

/** Apakah penyimpanan object storage (Vercel Blob) aktif di sisi server. */
export function isObjectStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Simpan file ke penyimpanan (Vercel Blob bila tersedia, fallback storage
 * lokal untuk dev) + catat metadata di tabel UploadedFile.
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

  let storedName: string;
  let buffer: Buffer | null = null;

  if (isObjectStorageEnabled()) {
    // Unggah langsung ke Vercel Blob (object storage) — mendukung 50 MB dan
    // tahan terhadap redeploy (filesystem /tmp Vercel bersifat ephemeral).
    const { uploadToBlobServer } = await import("@/lib/blob-storage");
    const uploaded = await uploadToBlobServer({ file, kind });
    storedName = uploaded.pathname;
    // Logo/avatar/gambar berita di-embed base64 supaya tetap tampil walau
    // object storage belum/tidak dapat dibaca. Ambil byte dari Blob karena
    // file tidak pernah menyentuh filesystem lokal pada jalur ini.
    if (
      (kind === "AVATAR" || kind === "ARTICLE_IMAGE" || kind === "SCHOOL_LOGO") &&
      file.size <= EMBED_MAX_BYTES
    ) {
      buffer = await readStoredBuffer(storedName);
    }
  } else {
    await ensureStoredDir();
    storedName = `${crypto.randomUUID()}${extFor(mime)}`;
    buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath(storedName), buffer);
  }

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
    url: fileUrl(storedName),
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
  };
  // Avatar: embiada base64 supaya foto tetap tersimpan saat redeploy
  // (storage serverless /tmp dapat berubah). Hanya untuk gambar profil kecil.
  // Bila file disimpan di Blob, embeddedAvatar tidak diperlukan — URL blob
  // sudah persisten di Vercel Blob.
  // Gambar berita juga di-embed base64 supaya tetap tampil saat redeploy
  // (storage /tmp Vercel ephemeral) meski Blob belum dikonfigurasi.
  if (
    (kind === "AVATAR" || kind === "ARTICLE_IMAGE" || kind === "SCHOOL_LOGO") &&
    buffer &&
    buffer.byteLength <= EMBED_MAX_BYTES
  ) {
    result.embedded = `data:${mime};base64,${buffer.toString("base64")}`;
  }
  return result;
}

export async function getStoredFilePath(storedName: string): Promise<string | null> {
  // File yang tersimpan di Vercel Blob tidak ada di filesystem lokal.
  // Pemanggil (mis. pdf-parser) harus memakai readBlobBuffer untuk blob.
  if (isBlobPathname(storedName)) return null;
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
  if (isBlobPathname(storedName)) {
    const { deleteBlob } = await import("@/lib/blob-storage");
    await deleteBlob(storedName);
    return;
  }
  const safe = path.basename(storedName);
  try {
    await fs.unlink(storagePath(safe));
  } catch {
    // file tidak ada — abaikan
  }
}

/** Baca seluruh isi file dari penyimpanan (Blob atau lokal) sebagai Buffer. */
export async function readStoredBuffer(storedName: string): Promise<Buffer | null> {
  if (isBlobPathname(storedName)) {
    const { readBlobBuffer } = await import("@/lib/blob-storage");
    return readBlobBuffer(storedName);
  }
  const filePath = await getStoredFilePath(storedName);
  if (!filePath) return null;
  try {
    return await fs.readFile(/* turbopackIgnore: true */ filePath);
  } catch {
    return null;
  }
}

export function fileUrl(storedName: string): string {
  // Encode per segmen supaya pathname ber-folder (mis. `logos/xxx.png`)
  // tetap menjadi rute yang valid untuk catch-all /api/files/[...storedName].
  const segments = storedName.split("/").map((s) => encodeURIComponent(s));
  return `/api/files/${segments.join("/")}`;
}

/** Ekstrak storedName dari URL /api/files/... (mendukung path ber-folder). */
export function storedNameFromUrl(url: string): string | null {
  const marker = "/api/files/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  const rest = url.slice(idx + marker.length);
  if (!rest) return null;
  return rest
    .split("/")
    .map((s) => decodeURIComponent(s))
    .join("/");
}
