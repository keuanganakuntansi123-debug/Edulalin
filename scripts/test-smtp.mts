/**
 * Uji kirim email OTP via SMTP Gmail.
 *
 * Jalankan: npm run test:smtp
 * Pastikan SMTP_PASS (App Password Gmail) sudah terisi di .env
 * sebelum menjalankan script ini.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendMail, verifyMailConnection, getMailStatus } from "../src/lib/mail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
const user = process.env.SMTP_USER?.trim();
// App Password Gmail sering tersalin dengan spasi — buang semua whitespace.
const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
const fromName = process.env.SMTP_FROM ?? "EDULALIN";

if (!user || !pass) {
  console.error("X SMTP_USER / SMTP_PASS belum di-set di .env");
  console.error(`   SMTP_USER=${user ?? "(kosong)"}`);
  console.error(
    `   SMTP_PASS=${pass ? `(terisi ${pass.length} karakter)` : "(kosong)"}`
  );
  console.error("\n   Jalankan `npm run setup:smtp` untuk mengisi App Password Gmail 16 karakter.");
  process.exit(1);
}

if (pass.length !== 16) {
  console.warn(
    `! Peringatan: App Password Gmail biasanya 16 karakter, saat ini ${pass.length} karakter.`
  );
}

const to = process.argv[2] ?? user;
const otp = String(100000 + Math.floor(Math.random() * 900000));
const status = getMailStatus();

// 1) Pastikan kredensial & koneksi valid lebih dulu agar pesan error spesifik.
const conn = await verifyMailConnection();
if (conn.ok) {
  console.log(`OK Koneksi & autentikasi SMTP berhasil (${status.host}, secure=${status.secure})`);
} else {
  const msg = conn.error;
  console.error("X Gagal terhubung / autentikasi ke server SMTP:");
  console.error(`   ${msg}`);
  if (/535|EAUTH|Invalid login|Username and Password not accepted/i.test(msg)) {
    console.error(
      "   Penyebab umum: SMTP_PASS bukan App Password 16 karakter, atau Verifikasi 2 Langkah belum aktif."
    );
    console.error("   Buat App Password: https://myaccount.google.com/apppasswords");
  } else if (/ETIMEDOUT|ESOCKET|ECONNECTION|ENOTFOUND/i.test(msg)) {
    console.error(
      `   Jaringan/firewall memblokir ${status.host}. Coba SMTP_PORT=587 dengan SMTP_SECURE=false.`
    );
  }
  process.exit(1);
}

const sent = await sendMail({
  to,
  subject: "EDULALIN — Uji Kirim Email OTP",
  text: `Halo,\n\nIni email uji dari EDULALIN. Kode OTP: ${otp}\n\n— Tim EDULALIN`,
  html: `<div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1d4ed8;">Kode OTP Uji: <span style="letter-spacing:4px;font-weight:800;">${otp}</span></h2>
      <p style="color:#334155;">Berhasil terkirim via SMTP ${status.host}. 🎉</p>
    </div>`,
});

if (sent.ok) {
  console.log(`OK Email terkirim ke ${to}`);
  console.log(`   messageId: ${sent.messageId}`);
  process.exit(0);
} else {
  console.error("X Gagal mengirim email:");
  console.error(`   ${sent.error}`);
  process.exit(1);
}