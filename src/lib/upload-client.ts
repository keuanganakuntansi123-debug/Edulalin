"use client";

/**
 * Pengecekan ketersediaan Vercel Blob di sisi client.
 * Value dibaca dari process.env saat build (Next.js inline NEXT_PUBLIC_*).
 * Token itu sendiri TIDAK pernah diekspos ke client — hanya flag boolean.
 */
export function isBlobUploadEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BLOB_UPLOAD_ENABLED === "1";
}
