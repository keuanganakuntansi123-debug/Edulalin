import { get, del, put, head } from "@vercel/blob";
import {
  UPLOAD_LIMIT_BYTES,
  UPLOAD_LIMIT_LABEL,
  MULTIPART_THRESHOLD_BYTES,
  ALLOWED_MIME,
  blobPathname,
  BLOB_PREFIX,
} from "@/lib/upload-config";
import type { FileKind } from "@/generated/prisma/client";

/**
 * Vercel Blob (object storage) untuk file unggahan besar (hingga kapasitas
 * layanan penyimpanan, 500 MB per berkas).
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

/**
 * Jenis file yang diizinkan per kind (untuk token upload client).
 * Delegasi ke `ALLOWED_MIME` agar klien & server selalu sinkron.
 */
export function blobAllowedContentTypes(kind: FileKind): string[] {
  return ALLOWED_MIME[kind];
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
  if (file.size > UPLOAD_LIMIT_BYTES) {
    throw new Error(`Ukuran file melebihi kapasitas penyimpanan ${UPLOAD_LIMIT_LABEL}.`);
  }
  const pathname = blobPathname(kind, file.name);
  const result = await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    multipart: file.size > MULTIPART_THRESHOLD_BYTES,
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
