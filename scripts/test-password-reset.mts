/**
 * Uji end-to-end alur "Lupa Password via Admin" + notifikasi lonceng terhadap
 * database Neon asli.
 *
 * Memakai fungsi inti produksi (`@/lib/password-reset-service`) serta layanan
 * notifikasi (`@/lib/notification-service`) sehingga rantai pengajuan →
 * verifikasi identitas ketat → reset oleh Admin → notifikasi lonceng
 * benar-benar diuji, bukan sekadar UI.
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
const RUN_STARTED_AT = new Date();

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
  if (user) {
    await prisma.notification.deleteMany({ where: { recipientId: user.id } });
    await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  // Bersihkan notifikasi uji yang sempat terkirim ke pengguna asli (Admin/Polisi/Murid).
  // Hanya menyasar baris yang memuat identitas QA agar data asli tidak tersentuh.
  await prisma.notification.deleteMany({
    where: {
      type: "PASSWORD_RESET_REQUEST",
      createdAt: { gte: RUN_STARTED_AT },
      OR: [{ body: { contains: TEST_EMAIL } }, { title: { contains: "QA RESET MURID" } }],
    },
  });
  await prisma.notification.deleteMany({
    where: {
      createdAt: { gte: RUN_STARTED_AT },
      title: { contains: "QA MODUL NOTIFIKASI" },
    },
  });
  await prisma.module.deleteMany({ where: { title: "QA MODUL NOTIFIKASI" } });
}

async function main() {
  // Impor setelah env siap (service memakai prisma singleton).
  const {
    submitPasswordResetRequest,
    completePasswordReset,
    rejectPasswordRequest,
    changeUserPassword,
  } = await import("../src/lib/password-reset-service");
  const { notifyPasswordRequestToAdmins, notifyPasswordChanged, notifyNewModule } = await import(
    "../src/lib/notification-service"
  );

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

  console.log("\n[1] Identitas salah → ditolak dengan peringatan resmi");
  const wrong = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "NAMA SALAH TOTAL",
    educationLevel: "SD",
    classLevel: "10",
    major: "TKJ",
  });
  assert(Boolean(wrong.error), "Pengajuan identitas salah ditolak");
  assert(
    wrong.error === "Data identitas tidak sesuai dengan data akun terdaftar.",
    "Pesan peringatan sesuai ketentuan",
  );
  const wrongRows = await prisma.passwordResetRequest.count({ where: { userId: user.id } });
  assert(wrongRows === 0, "Tidak ada baris pengajuan dibuat saat identitas salah");

  console.log("\n[2] Pengajuan identitas benar → terverifikasi otomatis");
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
  const okRow = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  assert(okRow?.name === "QA RESET MURID", "Nama pengajuan tersimpan HURUF KAPITAL");

  console.log("\n[2b] Input huruf kecil tetap diterima (dicocokkan tanpa peka kapital)");
  const lower = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "qa reset murid",
    educationLevel: "sma",
    classLevel: "10",
    major: "mipa",
  });
  assert(lower.verified === true, "Huruf kecil terverifikasi");

  console.log("\n[2c] Detail salah (kelas/jurusan) → ditolak");
  const badDetail = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "QA RESET MURID",
    classLevel: "11",
  });
  assert(
    badDetail.error === "Data identitas tidak sesuai dengan data akun terdaftar.",
    "Detail identitas salah ditolak",
  );

  console.log("\n[3] Anti-duplikat: pengajuan dalam 5 menit mengembalikan yang sama");
  const dup = await submitPasswordResetRequest({
    email: TEST_EMAIL,
    name: "QA RESET MURID",
    educationLevel: "SMA",
    classLevel: "10",
    major: "MIPA",
  });
  assert(dup.requestId === requestId, "Pengajuan duplikat tidak membuat baris baru");

  console.log("\n[4] Guard: pengajuan belum terverifikasi tidak dapat diproses");
  const manual = await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      name: "QA RESET MURID",
      email: TEST_EMAIL,
      role: "MURID",
      status: "PENDING",
      verified: false,
      matchScore: 40,
    },
  });
  const blocked = await completePasswordReset({
    requestId: manual.id,
    adminId: admin.id,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  });
  assert(Boolean(blocked.error), "Reset ditolak tanpa identitas valid");
  await prisma.passwordResetRequest.delete({ where: { id: manual.id } });

  console.log("\n[5] Reset password oleh Admin untuk pengajuan valid");
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
  assert(Boolean(reset.audit?.name), "Hasil reset memuat nama pengguna untuk notifikasi");
  assert(Boolean(reset.audit?.changedAt), "Hasil reset memuat waktu perubahan");

  console.log("\n[6] Efek reset tersinkron ke DB");
  const after = await prisma.user.findUnique({ where: { id: user.id } });
  assert(
    Boolean(after && (await verifyPassword(NEW_PASSWORD, after.passwordHash))),
    "Password baru valid di database",
  );
  assert(
    Boolean(after && !(await verifyPassword(OLD_PASSWORD, after.passwordHash))),
    "Password lama tidak berlaku lagi",
  );
  const done = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  assert(done?.status === "COMPLETED", "Pengajuan ditandai COMPLETED (hilang dari daftar aktif)");
  assert(done?.handledById === admin.id, "Pengajuan mencatat Admin pemroses");

  console.log("\n[7] Pengajuan selesai tidak dapat diproses ulang");
  const again = await completePasswordReset({
    requestId,
    adminId: admin.id,
    newPassword: "lagi678901",
    confirmPassword: "lagi678901",
  });
  assert(Boolean(again.error), "Reset kedua ditolak (pengajuan sudah selesai)");

  console.log("\n[8] Notifikasi lonceng");
  const adminNotified = await notifyPasswordRequestToAdmins({
    requestId,
    name: "QA RESET MURID",
    email: TEST_EMAIL,
    roleLabel: "Murid",
    submittedAt: new Date(),
    summary: "Sekolah: SMAN UJI · Kelas: 10",
  });
  assert(adminNotified > 0, "Admin menerima notifikasi lonceng pengajuan");
  const adminNotifRow = await prisma.notification.findFirst({
    where: { recipientId: admin.id, type: "PASSWORD_RESET_REQUEST" },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(adminNotifRow), "Notifikasi pengajuan tersimpan di DB");

  await notifyPasswordChanged({
    userId: user.id,
    name: "QA RESET MURID",
    changedAt: new Date(),
    changedByLabel: "Admin Uji",
    method: "Reset melalui pengajuan Lupa Password",
  });
  const userNotif = await prisma.notification.findFirst({
    where: { recipientId: user.id, type: "PASSWORD_CHANGED" },
  });
  assert(Boolean(userNotif), "Pengguna menerima notifikasi lonceng perubahan password");
  assert(
    Boolean(userNotif && !/baru654321|lama123456/.test(userNotif.body)),
    "Notifikasi tidak memuat password",
  );

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
    "Password mandiri tersimpan di DB",
  );
  assert(
    Boolean(selfUser && !(await verifyPassword(NEW_PASSWORD, selfUser.passwordHash))),
    "Password Admin sebelumnya tidak berlaku lagi",
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

  console.log("\n[12] Notifikasi modul baru tersinkron (murid/guru/polisi)");
  const mod = await prisma.module.create({
    data: {
      title: "QA MODUL NOTIFIKASI",
      description: "Modul uji notifikasi otomatis",
      educationLevel: "SMA",
      status: "ACTIVE",
      moduleType: "PDF",
    },
  });
  const modNotif = await notifyNewModule({
    actorId: admin.id,
    actorName: admin.name,
    moduleId: mod.id,
    title: mod.title,
    educationLevel: "SMA",
    schoolId: null,
    schoolIds: [],
    publishedAt: new Date(),
  });
  assert(modNotif.recipients > 0, "Notifikasi modul baru terkirim ke penerima");
  const modNotifRow = await prisma.notification.findFirst({
    where: { recipientId: user.id, type: "MODULE_NEW" },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(modNotifRow), "Murid menerima notifikasi modul baru");
  assert(
    Boolean(modNotifRow && modNotifRow.title.includes("QA MODUL NOTIFIKASI")),
    "Notifikasi modul memuat judul modul",
  );
  assert(
    Boolean(modNotifRow && modNotifRow.link?.includes(mod.id)),
    "Notifikasi modul memuat tautan membuka modul",
  );
  const policeNotif = await prisma.notification.findFirst({
    where: { type: "MODULE_NEW", recipient: { role: "POLISI" } },
    orderBy: { createdAt: "desc" },
  });
  assert(Boolean(policeNotif), "Polisi menerima notifikasi modul baru sesuai hak akses");

  await cleanup();
  console.log(
    failures === 0
      ? "\n✅ SEMUA UJI LULUS — alur lupa password & notifikasi lonceng tersinkron dengan Neon."
      : `\n❌ ${failures} uji GAGAL.`,
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
