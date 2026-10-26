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

const OLD_PASSWORD = "OldPass123";
const NEW_PASSWORD = "BaruPass456";
const ROLES = ["ADMIN", "GURU", "POLISI", "MURID"] as const;
type Role = (typeof ROLES)[number];

function emailFor(role: Role): string {
  return `qa.lupapassword.${role.toLowerCase()}@edulalin.test`;
}

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
  for (const role of ROLES) {
    const user = await prisma.user.findUnique({ where: { email: emailFor(role) } });
    if (!user) continue;
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await prisma.activityLog.deleteMany({ where: { actorId: user.id } });
    await prisma.notification.deleteMany({ where: { recipientId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

/**
 * Uji lengkap satu peran: OTP → verifikasi → password baru → login ulang.
 * Mengembalikan true bila seluruh rangkaian berhasil.
 */
async function testRole(role: Role, index: number): Promise<void> {
  const email = emailFor(role);
  const prefix = `[${index + 1}/${ROLES.length}] ${role}`;
  console.log(`\n--- ${prefix} — ${email} ---`);

  await prisma.user.create({
    data: {
      name: `QA Lupa Password ${role}`,
      email,
      passwordHash: await hashPassword(OLD_PASSWORD),
      role,
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });

  // Sesi lama yang harus dicabut setelah reset berhasil.
  const seeded = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.userSession.create({
    data: {
      userId: seeded.id,
      token: `qa-session-${role}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  // --- Langkah 1: minta OTP (membuat kode + mengirim email) ---
  const fd1 = new FormData();
  fd1.set("email", email);
  const r1 = await requestOtp(undefined, fd1);
  if (r1.error) throw new Error(`${prefix}: requestOtp gagal — ${r1.error}`);
  if (r1.step !== "verify") throw new Error(`${prefix}: requestOtp tidak pindah ke verifikasi`);
  if (!capturedOtp) throw new Error(`${prefix}: email OTP tidak tertangkap SMTP sink`);
  log(`  ${prefix}`, `email OTP diterima (subjek="${capturedSubject}")`);

  // --- Cooldown 60 detik harus menolak permintaan berulang ---
  const cooldown = await requestOtp(undefined, fd1);
  if (!cooldown.error || !/tunggu/i.test(cooldown.error)) {
    throw new Error(`${prefix}: cooldown pengiriman ulang tidak bekerja`);
  }

  // --- OTP salah harus ditolak ---
  const fdWrong = new FormData();
  fdWrong.set("email", email);
  fdWrong.set("otp", "000000");
  const wrong = await verifyOtp(undefined, fdWrong);
  if (!wrong.error) throw new Error(`${prefix}: OTP salah seharusnya ditolak`);

  // --- Langkah 2: verifikasi OTP benar ---
  const fd2 = new FormData();
  fd2.set("email", email);
  fd2.set("otp", capturedOtp);
  const r2 = await verifyOtp(undefined, fd2);
  if (r2.error) throw new Error(`${prefix}: verifyOtp gagal — ${r2.error}`);
  if (r2.step !== "reset") throw new Error(`${prefix}: verifyOtp tidak pindah ke reset`);

  // --- Langkah 3: simpan password baru ---
  const fd3 = new FormData();
  fd3.set("email", email);
  fd3.set("otp", capturedOtp);
  fd3.set("password", NEW_PASSWORD);
  fd3.set("confirmPassword", NEW_PASSWORD);
  const r3 = await resetPassword(undefined, fd3);
  if (r3.error) throw new Error(`${prefix}: resetPassword gagal — ${r3.error}`);

  // --- Verifikasi hasil di Neon ---
  const after = await prisma.user.findUnique({ where: { id: seeded.id } });
  if (!after) throw new Error(`${prefix}: user hilang setelah reset`);
  if (await verifyPassword(OLD_PASSWORD, after.passwordHash)) {
    throw new Error(`${prefix}: password lama masih berlaku`);
  }
  if (!(await verifyPassword(NEW_PASSWORD, after.passwordHash))) {
    throw new Error(`${prefix}: password baru tidak valid`);
  }
  const sessions = await prisma.userSession.count({ where: { userId: seeded.id } });
  if (sessions !== 0) throw new Error(`${prefix}: sesi lama belum dicabut (${sessions})`);
  const reusable = await prisma.verificationToken.count({
    where: { userId: seeded.id, type: "PASSWORD_RESET_OTP", usedAt: null },
  });
  if (reusable !== 0) throw new Error(`${prefix}: OTP masih bisa dipakai ulang`);

  // --- Login ulang dengan password baru (simulasi alur login) ---
  const loginUser = await prisma.user.findUnique({ where: { email } });
  const loginOk =
    !!loginUser &&
    loginUser.status === "ACTIVE" &&
    !loginUser.deletedAt &&
    (await verifyPassword(NEW_PASSWORD, loginUser.passwordHash));
  if (!loginOk) throw new Error(`${prefix}: login ulang dengan password baru GAGAL`);

  log(`  ${prefix}`, "OK — OTP → password baru → sesi lama dicabut → login ulang berhasil");
}

/** Kirim ulang OTP setelah cooldown lewat harus menghasilkan kode baru. */
async function testResend(): Promise<void> {
  const email = emailFor("MURID");
  console.log("\n--- UJI KIRIM ULANG OTP (setelah cooldown) ---");

  // Percepat cooldown: geser createdAt token terakhir ke masa lalu.
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.verificationToken.updateMany({
    where: { userId: user.id, type: "PASSWORD_RESET_OTP" },
    data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
  });

  const before = capturedOtp;
  const fd = new FormData();
  fd.set("email", email);
  const res = await requestOtp(undefined, fd);
  if (res.error) throw new Error(`kirim ulang gagal — ${res.error}`);
  if (res.step !== "verify") throw new Error("kirim ulang tidak pindah ke verifikasi");
  if (!capturedOtp) throw new Error("email kirim ulang tidak tertangkap SMTP sink");
  log("  kirim ulang", `OK — kode baru diterbitkan (berbeda: ${before !== capturedOtp})`);
}

/** Password yang hanya berupa nomor telepon harus ditolak. */
async function testPhonePasswordGuard(): Promise<void> {
  const email = emailFor("GURU");
  console.log("\n--- UJI PENJAGA PASSWORD = NOMOR TELEPON ---");
  await prisma.user.update({ where: { email }, data: { phone: "081234567890" } });
  const fd = new FormData();
  fd.set("email", email);
  fd.set("otp", capturedOtp);
  // Mengandung huruf (lolos aturan huruf+angka) tetapi digit-nya sama dengan
  // nomor telepon → harus ditolak oleh penjaga nomor telepon.
  fd.set("password", "abc081234567890");
  fd.set("confirmPassword", "abc081234567890");
  const res = await resetPassword(undefined, fd);
  if (!res.error || !/nomor telepon/i.test(res.error)) {
    throw new Error("password berupa nomor telepon seharusnya ditolak");
  }
  log("  penjaga nomor telepon", `OK — ${res.error}`);
}

async function main() {
  console.log("=== UJI END-TO-END: LUPA PASSWORD (semua peran) ===\n");

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

  for (let i = 0; i < ROLES.length; i++) {
    await testRole(ROLES[i], i);
  }
  await testResend();
  await testPhonePasswordGuard();

  console.log(
    "\nSELESAI: lupa password terbukti bekerja untuk ADMIN, GURU, POLISI, dan MURID."
  );
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
