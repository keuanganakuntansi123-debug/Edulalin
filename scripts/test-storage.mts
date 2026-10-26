/**
 * Uji end-to-end penyimpanan file EDULALIN terhadap konfigurasi nyata
 * (Vercel Blob bila BLOB_READ_WRITE_TOKEN tersedia, atau storage lokal).
 *
 * Memakai fungsi produksi `saveUploadedFile` / `readStoredBuffer` /
 * `removeStoredFile`, sehingga membuktikan berkas benar-benar tersimpan,
 * dapat dibaca kembali, dan metadata tercatat di Neon (tabel UploadedFile).
 *
 * Jalankan: npx tsx scripts/test-storage.mts
 * Membuat baris uji sementara lalu menghapusnya kembali (idempoten).
 */
// WAJIB diimpor paling awal: memuat .env + .env.local sebelum modul lain
// (mis. `@/lib/prisma`) membaca process.env.
import "./load-env.mts";
import {
  saveUploadedFile,
  readStoredBuffer,
  removeStoredFile,
  isObjectStorageEnabled,
} from "../src/lib/storage";
import { prisma } from "../src/lib/prisma";

let failures = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

async function main() {
  console.log("[1] Backend penyimpanan");
  console.log(`  • Object storage (Vercel Blob): ${isObjectStorageEnabled() ? "aktif" : "TIDAK aktif (fallback lokal)"}`);

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("Tidak ada Admin di database. Jalankan `npm run seed` dahulu.");
    process.exit(1);
  }

  const payload = Buffer.from(
    `EDULALIN storage test ${new Date().toISOString()}\n${"x".repeat(2048)}`,
    "utf8"
  );
  const file = new File([payload], "uji-storage-edulalin.txt", { type: "text/plain" });

  console.log("\n[2] Simpan berkas (MODULE_CONTENT, 50 MB)");
  const saved = await saveUploadedFile({
    file,
    kind: "MODULE_CONTENT",
    ownerId: admin.id,
  });
  assert(Boolean(saved.id), "Berkas tersimpan dan mengembalikan id");
  assert(saved.size === payload.byteLength, "Ukuran tercatat benar");
  assert(saved.url.startsWith("/api/files/"), "URL layanan berkas sesuai");

  console.log("\n[3] Metadata tercatat di Neon");
  const row = await prisma.uploadedFile.findUnique({ where: { id: saved.id } });
  assert(Boolean(row), "Baris UploadedFile ditemukan di Neon");
  assert(row?.kind === "MODULE_CONTENT", "Jenis berkas MODULE_CONTENT");
  assert(row?.storedName === saved.storedName, "storedName tersinkron");
  if (isObjectStorageEnabled()) {
    assert(Boolean(row?.storedName.includes("/")), "storedName memakai path Blob (ber-folder)");
  }

  console.log("\n[4] Baca kembali isi berkas");
  const readBack = await readStoredBuffer(saved.storedName);
  assert(Boolean(readBack), "Berkas dapat dibaca kembali dari penyimpanan");
  assert(
    readBack?.byteLength === payload.byteLength &&
      readBack?.toString("utf8") === payload.toString("utf8"),
    "Isi berkas identik dengan yang diunggah (tahan redeploy bila Blob)"
  );

  console.log("\n[5] Bersihkan data uji");
  await removeStoredFile(saved.storedName);
  await prisma.uploadedFile.delete({ where: { id: saved.id } });
  const gone = await prisma.uploadedFile.findUnique({ where: { id: saved.id } });
  assert(gone === null, "Baris uji dihapus dari Neon");
  const afterDelete = await readStoredBuffer(saved.storedName);
  assert(afterDelete === null, "Berkas uji dihapus dari penyimpanan");

  console.log(
    failures === 0
      ? "\nSEMUA UJI PENYIMPANAN LULUS ✅"
      : `\nADA ${failures} UJI GAGAL ❌`
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("Uji penyimpanan gagal:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
