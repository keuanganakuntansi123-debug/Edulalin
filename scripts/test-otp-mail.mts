/**
 * Bukti nyata bahwa pengiriman kode OTP BERFUNGSI saat SMTP terkonfigurasi.
 *
 * Script ini membuat akun SMTP uji (Ethereal — server SMTP sungguhan yang
 * menangkap email, bukan mengirim ke internet), mengarahkan konfigurasi SMTP
 * ke akun tersebut, lalu mengirim email OTP memakai fungsi produksi
 * `src/lib/mail.ts` (`sendMail` + `generateOtp`).
 *
 * Jalankan: npx tsx scripts/test-otp-mail.mts
 */
import "dotenv/config";
import { createTestAccount } from "nodemailer";
import { generateOtp, getMailStatus, sendMail } from "../src/lib/mail";

const mask = (v: string | null) =>
  !v ? "(kosong)" : v.length <= 3 ? "***" : v.slice(0, 2) + "***" + v.slice(-1);

const main = async () => {
  console.log("=== UJI PENGIRIMAN KODE OTP (Ethereal SMTP) ===\n");

  console.log("Status SMTP saat ini (dari .env):");
  const before = getMailStatus();
  console.log(
    `  configured=${before.configured}  host=${before.host}  port=${before.port}  secure=${before.secure}`
  );
  console.log(`  SMTP_USER=${mask(before.user)}  SMTP_PASS=${before.passLength} karakter`);
  console.log(`  variabel kosong: ${before.missing.length ? before.missing.join(", ") : "(tidak ada)"}`);

  console.log("\nMembuat akun SMTP uji (Ethereal)...");
  const account = await createTestAccount();
  console.log(`  host=${account.smtp.host}  port=${account.smtp.port}  user=${mask(account.user)}`);

  // Arahkan konfigurasi SMTP ke server Ethereal untuk uji ini saja.
  process.env.SMTP_HOST = account.smtp.host;
  process.env.SMTP_PORT = String(account.smtp.port);
  process.env.SMTP_SECURE = String(account.smtp.secure);
  process.env.SMTP_USER = account.user;
  process.env.SMTP_PASS = account.pass;
  process.env.SMTP_FROM = "EDULALIN";

  const after = getMailStatus();
  if (!after.configured) {
    console.error("\nX Gagal menyiapkan konfigurasi SMTP uji.");
    process.exit(1);
  }

  const otp = generateOtp();
  console.log(`\nMengirim email berisi kode OTP: ${otp}`);
  const to = process.argv[2] ?? account.user;

  const result = await sendMail({
    to,
    subject: "Kode OTP Reset Password EDULALIN",
    text: `Halo Pengguna,

Gunakan kode OTP berikut untuk reset password EDULALIN: ${otp}

Kode berlaku 5 menit dan hanya dapat digunakan sekali.

— Tim EDULALIN`,
    html: `<div style="font-family:Arial,sans-serif"><h2>Reset Password EDULALIN</h2><p>Kode OTP Anda:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#1d4ed8">${otp}</p></div>`,
  });

  if (!result.ok) {
    console.error(`\nX GAGAL mengirim email: ${result.error}`);
    process.exit(1);
  }

  console.log(`\nOK Email DITERIMA server SMTP. messageId=${result.messageId}`);
  console.log(
    "(Kode OTP di atas dikirim lewat fungsi produksi `sendMail` di src/lib/mail.ts.)"
  );

  console.log("\nSELESAI: alur pengiriman kode OTP terbukti berfungsi.");
  console.log(
    "Untuk produksi, isi SMTP_PASS dengan Gmail App Password 16 karakter lalu jalankan: npm run setup:smtp"
  );
};

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
