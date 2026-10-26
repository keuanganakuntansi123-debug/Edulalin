import { get, del, put, head } from "@vercel/blob";
import { MAX_SIZES, blobPathname, BLOB_PREFIX } from "@/lib/upload-config";
import type { FileKind } from "@/generated/prisma/client";

/**
 * Vercel Blob (object storage) untuk file unggahan besar (hingga 50 MB).
 * Client upload: browser → Blob langsung (melewati limit body Vercel Function
 * 4.5 MB), metadata & URL disimpan di Neon (tabel UploadedFile).
 *
 * `storedName` pada baris UploadedFile berisi *pathname* blob
 * (contoh: `modules/xxx.pdf`). File lokal lama tetap berupa UUID tanpa slash,
 * sehingga isBlobPathname() bisa membedakannya.
 */

export function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Pathname blob menyimpan slash ('/'), tidak seperti storedName lokal (UUID). */
export function isBlobPathname(storedName: string): boolean {
  return storedName.includes("/");
}

export { blobPathname, BLOB_PREFIX };

/** Jenis file yang diizinkan per kind (untuk token upload client). */
export function blobAllowedContentTypes(kind: FileKind): string[] {
  switch (kind) {
    case "MODULE_CONTENT":
      return [
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
      ];
    case "MODULE_THUMBNAIL":
      return ["image/jpeg", "image/png", "image/webp"];
    case "QUIZ_PDF":
      return ["application/pdf"];
    case "AVATAR":
      return ["image/jpeg", "image/png", "image/webp"];
    case "SITE_IMAGE":
      return ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    case "SCHOOL_LOGO":
      return ["image/jpeg", "image/png", "image/webp"];
    case "ARTICLE_IMAGE":
      return ["image/jpeg", "image/png", "image/webp"];
  }
}

export type BlobUploaded = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

/** Unggah file dari server ke Vercel Blob (dipakai fallback server-side). */
export async function uploadToBlobServer(input: {
  file: File;
  kind: FileKind;
}): Promise<BlobUploaded> {
  const { file, kind } = input;
  if (!isBlobStorageEnabled()) {
    throw new Error("Vercel Blob belum dikonfigurasi");
  }
  if (file.size > MAX_SIZES[kind]) {
    throw new Error("Ukuran file melebihi batas maksimal 50 MB");
  }
  const pathname = blobPathname(kind, file.name);
  const result = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    multipart: file.size > 5 * 1024 * 1024,
    contentType: file.type || undefined,
  });
  return {
    url: result.url,
    pathname: result.pathname,
    contentType: result.contentType,
    size: file.size,
  };
}

/** Hapus objek di Blob berdasarkan pathname (jika ada). */
export async function deleteBlob(pathname: string): Promise<void> {
  if (!isBlobStorageEnabled() || !isBlobPathname(pathname)) return;
  try {
    await del(pathname);
  } catch {
    // objek tidak ada — abaikan
  }
}

/**
 * Baca seluruh isi file dari Blob sebagai Buffer (untuk pemrosesan PDF dsb).
 * Mengembalikan null bila gagal.
 */
export async function readBlobBuffer(pathname: string): Promise<Buffer | null> {
  if (!isBlobStorageEnabled() || !isBlobPathname(pathname)) return null;
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const chunks: Uint8Array[] = [];
    const reader = result.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export type BlobStreamResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
} | null;

/**
 * Buka stream dari Blob (private) untuk disalurkan lewat /api/files.
 * `get` dari SDK memakai token BLOB_READ_WRITE_TOKEN di sisi server.
 */
export async function streamBlob(pathname: string): Promise<BlobStreamResult> {
  if (!isBlobStorageEnabled() || !isBlobPathname(pathname)) return null;
  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    // SDK get() mengembalikan blob.size = 0 untuk objek multipart besar;
    // gunakan head() untuk Content-Length yang akurat.
    const meta = await head(pathname).catch(() => null);
    return {
      stream: result.stream,
      contentType: result.blob.contentType,
      size: meta?.size ?? result.blob.size ?? 0,
    };
  } catch {
    return null;
  }
}
