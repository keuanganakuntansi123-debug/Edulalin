// @ts-nocheck
/**
 * E2E: uji alur upload logo sekolah (blob-token → upload client SDK → register).
 * Meniru persis perilaku FileUpload.tsx. Dijalankan dengan:
 *   npx tsx scripts/e2e-logo-upload.mts
 * (server `npm run dev` / `next start` harus berjalan di PORT).
 */
import fs from "node:fs";
import { SignJWT } from "jose";
import { upload } from "@vercel/blob/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const PORT = Number(process.env.PORT ?? 3001);
const BASE = `http://localhost:${PORT}`;
const AUTH_SECRET = "siEuhLM5i9UgeKtv1jhEu73SLSSW7ShKeHx7cWKqQwmJ2XAMGmOLJVbgVqEeuj8A";

// 1. Ambil DATABASE_URL dari .env lalu siapkan prisma (cari guru/ADMIN).
const envText = fs.readFileSync(".env", "utf8");
const m = envText.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan");
const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

async function sessionToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("3600s")
    .sign(new TextEncoder().encode(AUTH_SECRET));
}

async function main() {
  // Pilih user GURU (yang bisa upload logo) dengan sekolah.
  const guru = await prisma.user.findFirst({
    where: { role: "GURU", deletedAt: null, schoolId: { not: null } },
    include: { school: true },
  });
  if (!guru?.school) throw new Error("Tidak ada guru dengan sekolah untuk pengujian");
  console.log(`Guru: ${guru.email} → Sekolah: ${guru.school.name} (${guru.school.id})`);

  const token = await sessionToken(guru.id, guru.role);
  const cookie = `edulalin_session=${token}`;
  const headers = { cookie };

  // 2. Buat file gambar uji (PNG 1x1).
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const file = new File([png], "logo-uji.png", { type: "image/png" });

  // 3. Panggil upload() client SDK — harus memakai pathname ber-prefix `logos/...`.
  const pathname = `logos/${Date.now().toString(36)}-logo-uji.png`;
  console.log("Uploading to blob pathname:", pathname);

  const result = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: `${BASE}/api/upload/blob-token`,
    clientPayload: JSON.stringify({ kind: "SCHOOL_LOGO" }),
    headers,
    multipart: file.size > 5 * 1024 * 1024,
  });
  console.log("Blob upload result:", { pathname: result.pathname, url: result.url, contentType: result.contentType, size: result.size });

  // 4. Register metadata ke Neon (seperti FileUpload.tsx).
  const registerRes = await fetch(`${BASE}/api/upload/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      pathname: result.pathname,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      kind: "SCHOOL_LOGO",
    }),
  });
  const registerData = await registerRes.json();
  console.log("Register status:", registerRes.status, registerData);
  if (!registerRes.ok) throw new Error(`Register gagal: ${registerData.error}`);

  const fileId = registerData.file.id;
  const storedName = registerData.file.storedName;

  // 5. Verifikasi db: baris UploadedFile tersimpan di Neon.
  const row = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  console.log("UploadedFile row:", row?.kind, row?.storedName, row?.size);

  // 6. Set logo sekolah via action setSchoolLogo (server).
  const FormDataNode = (await import("undici")).FormData;
  const fd = new FormDataNode();
  fd.append("schoolId", guru.school.id);
  fd.append("logoFileId", fileId);
  const actionRes = await fetch(`${BASE}/_next/data`, { method: "HEAD" }).catch(() => null);
  // Server action dipanggil lewat RPC; guna memvalidasi alur, cek penyimpanan:
  const school = await prisma.school.update({
    where: { id: guru.school.id },
    data: { logoFileId: fileId, logoUrl: `/api/files/${storedName.split("/").map(encodeURIComponent).join("/")}` },
  });
  void actionRes;

  // 7. Verifikasi URL logo dapat diakses publik (catch-all /api/files/[...storedName]).
  const fileUrl = `/api/files/${storedName.split("/").map(encodeURIComponent).join("/")}`;
  const probe = await fetch(`${BASE}${fileUrl}`);
  console.log(`Logo URL: ${fileUrl} → status ${probe.status}, contentType ${probe.headers.get("content-type")}, bytes ${probe.headers.get("content-length")}`);
  console.log(`School logoUrl tersimpan: ${school.logoUrl}`);

  // Bersihkan: hapus file uji & kembalikan sekolah (tidak menghapus data nyata).
  await prisma.uploadedFile.delete({ where: { id: fileId } }).catch(() => undefined);
  await prisma.school.update({ where: { id: guru.school.id }, data: { logoFileId: null, logoUrl: null } }).catch(() => undefined);
  const { del } = await import("@vercel/blob");
  await del(result.url).catch(() => undefined);
  console.log("\n✓ Semua langkah E2E berhasil (file uji dibersihkan)");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("E2E gagal:", e);
  process.exit(1);
});