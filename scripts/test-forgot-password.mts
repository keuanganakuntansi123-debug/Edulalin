import "dotenv/config";
import net from "node:net";
import { prisma } from "../src/lib/prisma";
import { hashPassword, verifyPassword } from "../src/lib/password";
import {
  requestOtp,
  verifyOtp,
  resetPassword,
} from "../src/app/actions/password-reset-actions";

/**
 * Uji end-to-end alur "Lupa Password" memakai kode produksi asli:
 *   requestOtp() → verifyOtp() → resetPassword()
 *
 * Email tidak dikirim ke internet. Sebuah SMTP sink lokal (tanpa dependency
 * tambahan) menangkap pesan yang benar-benar dikirim oleh `sendMail`, lalu
 * kode OTP diambil dari isi pesan tersebut. Dengan begitu seluruh rantai
 * (termasuk pembuatan & pengiriman kode) terverifikasi, bukan disimulasikan.
 */

const EMAIL = "qa.lupapassword@edulalin.test";
const OLD_PASSWORD = "OldPass123";
const NEW_PASSWORD = "BaruPass456";

let capturedOtp = "";
let capturedSubject = "";
let smtpPort = 0;

function log(step: string, detail = "") {
  console.log(`${step}${detail ? ` — ${detail}` : ""}`);
}

/** SMTP sink minimal: cukup untuk menangkap isi pesan dari nodemailer. */
function startSmtpSink(): Promise<{ server: net.Server; port: number }> {
  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let body = "";

    const write = (line: string) => socket.write(`${line}\r\n`);

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      while (true) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end === -1) return;
          body = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          capturedOtp = extractOtp(body);
          capturedSubject = extractSubject(body);
          write("250 2.0.0 Ok: queued as QA");
          continue;
        }

        const idx = buffer.indexOf("\r\n");
        if (idx === -1) return;
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const upper = line.toUpperCase();

        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
          socket.write("250-localhost ESMTP QA\r\n");
          socket.write("250-AUTH PLAIN LOGIN\r\n");
          write("250 SIZE 10485760");
        } else if (upper.startsWith("AUTH PLAIN")) {
          write("235 2.7.0 Authentication successful");
        } else if (upper.startsWith("AUTH LOGIN")) {
          write("334 VXNlcm5hbWU6");
        } else if (upper.startsWith("MAIL FROM")) {
          write("250 2.1.0 Ok");
        } else if (upper.startsWith("RCPT TO")) {
          write("250 2.1.5 Ok");
        } else if (upper === "DATA") {
          inData = true;
          write("354 End data with <CR><LF>.<CR><LF>");
        } else if (upper === "QUIT") {
          write("221 2.0.0 Bye");
          socket.end();
        } else if (upper === "RSET" || upper === "NOOP") {
          write("250 2.0.0 Ok");
        } else {
          // Baris kredensial lanjutan setelah AUTH LOGIN/PLAIN.
          write("235 2.7.0 Authentication successful");
        }
      }
    });

    socket.on("error", () => undefined);
    write("220 localhost ESMTP QA ready");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    // Port 0 → OS memilih port bebas, sehingga tidak bentrok dengan proses lain.
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port });
    });
  });
}

/** Kode OTP dikirim sebagai quoted-printable/base64 — decode dulu lalu cari 6 digit. */
function extractOtp(raw: string): string {
  const decoded = decodeMessage(raw);
  const labeled = decoded.match(/Kode OTP:\s*(\d{6})/i);
  if (labeled) return labeled[1];
  const generic = decoded.match(/\b(\d{6})\b/);
  return generic ? generic[1] : "";
}

function extractSubject(raw: string): string {
  const match = raw.match(/^Subject:\s*(.+)$/im);
  return match ? match[1].trim() : "";
}

/** Decode transfer-encoding sederhana yang dipakai nodemailer. */
function decodeMessage(raw: string): string {
  if (/Content-Transfer-Encoding:\s*base64/i.test(raw)) {
    const parts = raw.split(/\r?\n\r?\n/);
    return parts
      .map((part) => {
        const cleaned = part.replace(/[^A-Za-z0-9+/=]/g, "");
        try {
          return Buffer.from(cleaned, "base64").toString("utf8");
        } catch {
          return part;
        }
      })
      .join("\n");
  }
  return raw
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

async function cleanup() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) return;
  await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
  await prisma.userSession.deleteMany({ where: { userId: user.id } });
  await prisma.activityLog.deleteMany({ where: { actorId: user.id } });
  await prisma.notification.deleteMany({ where: { recipientId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function main() {
  console.log("=== UJI END-TO-END: LUPA PASSWORD (OTP → password berganti) ===\n");

  const sink = await startSmtpSink();
  const server = sink.server;
  smtpPort = sink.port;
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = String(smtpPort);
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_USER = "qa@edulalin.test";
  process.env.SMTP_PASS = "qapassword123456";
  log("0. SMTP sink lokal aktif", `127.0.0.1:${smtpPort}`);

  await cleanup();

  const user = await prisma.user.create({
    data: {
      name: "QA Lupa Password",
      email: EMAIL,
      passwordHash: await hashPassword(OLD_PASSWORD),
      role: "MURID",
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });
  await prisma.userSession.create({
    data: {
      userId: user.id,
      token: `qa-session-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  log("1. Akun uji dibuat", EMAIL);

  // --- Langkah 1: minta OTP (membuat kode + mengirim email) ---
  const fd1 = new FormData();
  fd1.set("email", EMAIL);
  const r1 = await requestOtp(undefined, fd1);
  if (r1.error) throw new Error(`requestOtp gagal: ${r1.error}`);
  if (r1.step !== "verify") throw new Error("requestOtp tidak pindah ke langkah verifikasi");
  log("2. requestOtp", r1.message ?? "(ok)");

  if (!capturedOtp) throw new Error("Email OTP tidak tertangkap oleh SMTP sink");
  log("3. Email OTP diterima", `subjek="${capturedSubject}" kode=${capturedOtp.slice(0, 2)}****`);

  // --- Cooldown 60 detik harus menolak permintaan berulang ---
  const cooldown = await requestOtp(undefined, fd1);
  if (!cooldown.error || !/tunggu/i.test(cooldown.error)) {
    throw new Error("Cooldown pengiriman ulang tidak bekerja");
  }
  log("4. Cooldown aktif", cooldown.error);

  // --- OTP salah harus ditolak ---
  const fdWrong = new FormData();
  fdWrong.set("email", EMAIL);
  fdWrong.set("otp", "000000");
  const wrong = await verifyOtp(undefined, fdWrong);
  if (!wrong.error) throw new Error("OTP salah seharusnya ditolak");
  log("5. OTP salah ditolak", wrong.error);

  // --- Langkah 2: verifikasi OTP benar ---
  const fd2 = new FormData();
  fd2.set("email", EMAIL);
  fd2.set("otp", capturedOtp);
  const r2 = await verifyOtp(undefined, fd2);
  if (r2.error) throw new Error(`verifyOtp gagal: ${r2.error}`);
  if (r2.step !== "reset") throw new Error("verifyOtp tidak pindah ke langkah reset");
  log("6. verifyOtp", "kode benar → lanjut isi password baru");

  // --- Langkah 3: simpan password baru ---
  const fd3 = new FormData();
  fd3.set("email", EMAIL);
  fd3.set("otp", capturedOtp);
  fd3.set("password", NEW_PASSWORD);
  fd3.set("confirmPassword", NEW_PASSWORD);
  const r3 = await resetPassword(undefined, fd3);
  if (r3.error) throw new Error(`resetPassword gagal: ${r3.error}`);
  log("7. resetPassword", r3.message ?? "(ok)");

  // --- Verifikasi hasil di Neon ---
  const after = await prisma.user.findUnique({ where: { id: user.id } });
  if (!after) throw new Error("User hilang setelah reset");
  if (await verifyPassword(OLD_PASSWORD, after.passwordHash)) {
    throw new Error("Password lama masih berlaku");
  }
  if (!(await verifyPassword(NEW_PASSWORD, after.passwordHash))) {
    throw new Error("Password baru tidak valid");
  }
  log("8. Password diperbarui di Neon", "lama ditolak, baru valid");

  const sessions = await prisma.userSession.count({ where: { userId: user.id } });
  if (sessions !== 0) throw new Error(`Sesi lama belum dicabut (${sessions})`);
  log("9. Semua sesi lama dicabut", "0 tersisa");

  const reusable = await prisma.verificationToken.count({
    where: { userId: user.id, type: "PASSWORD_RESET_OTP", usedAt: null },
  });
  if (reusable !== 0) throw new Error("OTP masih bisa dipakai ulang");
  log("10. OTP sekali pakai", "0 token aktif");

  console.log("\nSELESAI: forgot password terbukti bekerja sampai password berganti.");
  server.close();
}

main()
  .catch((error) => {
    console.error(`\nUJI GAGAL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("Pembersihan: akun & data uji dihapus.");
    } catch (error) {
      console.warn(
        `Peringatan pembersihan: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    await prisma.$disconnect();
  });
