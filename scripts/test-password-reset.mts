/**
 * Uji end-to-end alur "Lupa Password via Admin" terhadap Neon DB.
 *
 * Memakai fungsi inti produksi (`@/lib/password-reset-service`) sehingga rantai
 * pengajuan → verifikasi identitas → reset oleh Admin → login pengguna benar-
 * benar diuji, bukan sekadar UI.
 *
 * Jalankan: npm run test:reset
 * Membuat akun QA sementara, lalu menghapusnya kembali di akhir (idempoten).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/password";

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

const TEST_EMAIL = "qa.reset.admin@edulalin.test";
const OLD_PASSWORD = "lama123456";
const NEW_PASSWORD = "baru654321";

let failures = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (!user) return;
  await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function main() {
  // Impor setelah env siap (service memakai prisma singleton).
  const {
    submitPasswordResetRequest,
    completePasswordReset,
    rejectPasswordRequest,
    changeUserPassword,
  } = await import("../src/lib/password-reset-service");

  await cleanup();

  const oldHash = await hashPassword(OLD_PASSWORD);
  const user = await prisma.user.create({
    data: {
      name: "QA RESET MURID",
      email: TEST_EMAIL,
      passwordHash: oldHash,
      role: "MURID",
      status: "ACTIVE",
      educationLevel: "SMA",
      classLevel: "10",
      major: "MIPA",
    },
  });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  assert(Boolean(admin), "Admin utama tersedia untuk reset");
  if (!admin) return;

  const wrong = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "NAMA SALAH TOTAL",
    educationLevel: "SD",
    classLevel: "10",
    major: "TKJ",
  });
  console.log("\n[1] Pengajuan identitas salah → perlu verifikasi manual");
  assert(wrong.success === true, "Pengajuan tetap tercatat (tidak hilang)");
  assert(wrong.verified === false, "Identitas tidak terverifikasi");

  console.log("\n[2] Anti-duplikat: pengajuan dalam 5 menit mengembalikan yang sama");
  const dup = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "QA RESET MURID",
    educationLevel: "SMA",
    classLevel: "10",
    major: "MIPA",
  });
  assert(dup.requestId === wrong.requestId, "Pengajuan duplikat tidak membuat baris baru");

  console.log("\n[3] Reset ditolak untuk pengajuan tak terverifikasi");
  const blocked = await completePasswordReset({
    requestId: wrong.requestId!,
    adminId: admin.id,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  });
  assert(Boolean(blocked.error), "Reset ditolak tanpa identitas valid");

  console.log("\n[4] Tolak pengajuan yang menunggu (membersihkan antrean)");
  const cleared = await rejectPasswordRequest({
    requestId: wrong.requestId!,
    adminId: admin.id,
    reason: "Identitas tidak cocok",
  });
  assert(cleared.success === true, "Pengajuan tidak valid ditolak");

  console.log("\n[5] Pengajuan identitas benar → terverifikasi otomatis");
  const ok = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "QA RESET MURID",
    educationLevel: "SMA",
    classLevel: "10",
    major: "MIPA",
  });
  assert(ok.success === true, "Pengajuan terkirim");
  assert(ok.verified === true, "Identitas terverifikasi otomatis");
  const requestId = ok.requestId!;
  assert(Boolean(requestId), "Pengajuan punya ID");

  console.log("\n[6] Reset password oleh Admin untuk pengajuan valid");
  const strong = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: "pendek",
    confirmPassword: "pendek",
  });
  assert(Boolean(strong.error), "Password lemah ditolak");

  const mismatch = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: NEW_PASSWORD,
    confirmPassword: "beda678901",
  });
  assert(Boolean(mismatch.error), "Konfirmasi tidak sama ditolak");

  const reset = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  });
  assert(reset.success === true, "Password berhasil diatur ulang oleh Admin");

  console.log("\n[7] Efek reset tersinkron ke DB");
  const after = await prisma.user.findUnique({ where: { id: user.id } });
  assert(
    Boolean(after && (await verifyPassword(NEW_PASSWORD, after.passwordHash))),
    "Password baru valid di database"
  );
  assert(
    Boolean(after && !(await verifyPassword(OLD_PASSWORD, after.passwordHash))),
    "Password lama tidak berlaku lagi"
  );
  const done = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  assert(done?.status === "COMPLETED", "Pengajuan ditandai COMPLETED (hilang dari daftar aktif)");
  assert(done?.handledById === admin.id, "Pengajuan mencatat Admin pemroses");

  console.log("\n[8] Pengajuan selesai tidak dapat diproses ulang");
  const again = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: "lagi678901",
    confirmPassword: "lagi678901",
  });
  assert(Boolean(again.error), "Reset kedua ditolak (pengajuan sudah selesai)");

  console.log("\n[9] Ubah password mandiri (verifikasi password lama)");
  const badOld = await changeUserPassword({
    userId: user.id,
    currentPassword: "salahsekali",
    newPassword: "mandiri12345",
    confirmPassword: "mandiri12345",
  });
  assert(Boolean(badOld.error), "Password lama salah → ditolak");

  const self = await changeUserPassword({
    userId: user.id,
    currentPassword: NEW_PASSWORD,
    newPassword: "mandiri12345",
    confirmPassword: "mandiri12345",
  });
  assert(self.success === true, "Ubah password mandiri berhasil");
  const selfUser = await prisma.user.findUnique({ where: { id: user.id } });
  assert(
    Boolean(selfUser && (await verifyPassword("mandiri12345", selfUser.passwordHash))),
    "Password mandiri tersimpan di DB"
  );
  assert(
    Boolean(selfUser && !(await verifyPassword(NEW_PASSWORD, selfUser.passwordHash))),
    "Password Admin sebelumnya tidak berlaku lagi"
  );

  console.log("\n[10] Tolak pengajuan baru");
  const toReject = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "QA RESET MURID",
    educationLevel: "SMA",
    classLevel: "10",
    major: "MIPA",
  });
  const rejected = await rejectPasswordRequest({
    requestId: toReject.requestId!,
    adminId: admin.id,
    reason: "Uji penolakan",
  });
  assert(rejected.success === true, "Pengajuan berhasil ditolak");
  const rejectedRow = await prisma.passwordResetRequest.findUnique({
    where: { id: toReject.requestId! },
  });
  assert(rejectedRow?.status === "REJECTED", "Status pengajuan REJECTED");

  console.log("\n[11] Email tak terdaftar ditolak");
  const unknown = await submitPasswordResetRequest({
    email: "tidak.ada@edulalin.test",
    name: "TIDAK ADA",
  });
  assert(unknown.error === "Email tidak terdaftar di EDULALIN.", "Email asing ditolak");

  await cleanup();
  console.log(
    failures === 0
      ? "\n✅ SEMUA UJI LULUS — alur lupa password via Admin berfungsi & tersinkron dengan Neon."
      : `\n❌ ${failures} uji GAGAL.`
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("Uji gagal:", e);
  await cleanup();
  await prisma.$disconnect();
  process.exit(1);
});
