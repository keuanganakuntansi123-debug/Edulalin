/**
 * Helper URL berkas yang aman dipakai di komponen klien maupun server.
 * Dipisah dari `@/lib/storage` supaya komponen klien tidak menarik
 * dependensi server (Prisma/pg) ke bundle browser.
 */

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
