import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Pengiriman email melalui SMTP Gmail (nodemailer).
 *
 * Konfigurasi dibaca dari environment:
 *  - SMTP_HOST (default smtp.gmail.com)
 *  - SMTP_PORT (default 465)
 *  - SMTP_USER  → alamat Gmail pengirim (mis. akun@edulalin.id)
 *  - SMTP_PASS  → App Password Gmail (16 karakter, bukan password akun)
 *  - SMTP_FROM  → nama pengirim tampilan (default = SMTP_USER)
 *  - SMTP_SECURE → true untuk 465, false untuk 587/TLS
 *
 * Catatan penting Gmail:
 *  1. Aktifkan "2-Step Verification" pada akun Google pengirim.
 *  2. Buat App Password di https://myaccount.google.com/apppasswords.
 *  3. Gunakan App Password sebagai SMTP_PASS.
 *  4. SMTP_USER harus alamat Gmail (mis. keuanganakuntansi123@gmail.com).
 *     SMTP_PASS = App Password 16 karakter, bukan password akun.
 *     SMTP_FROM hanya nama tampilan pengirim (default: EDULALIN).
 *
 * Bila port gagal (mis. 465 diblokir jaringan/Vercel), pengiriman otomatis
 * dicoba ulang lewat port alternatif 587 (STARTTLS) lalu 25. Terlihat di log
 * sebagai "[mail] port X gagal, mencoba port Y".
 */

/** Urutan port SMTP ketika SMTP_PORT tidak dieksplisitkan; 587 = fallback utama. */
const SMTP_PORT_FALLBACKS = [465, 587, 25] as const;

/** Kredensial SMTP yang sudah dinormalisasi (tanpa spasi pada App Password). */
type SmtpCredentials = { host: string; user: string; pass: string };

function readCredentials(): SmtpCredentials | null {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const user = process.env.SMTP_USER;
  // App Password Gmail sering tersalin dengan spasi — buang semua whitespace.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn(
      `[mail] SMTP tidak siap — SMTP_USER=${user ? "ada" : "KOSONG"}, SMTP_PASS=${
        pass ? `ada (${pass.length} karakter)` : "KOSONG"
      }. Pengiriman email OTP nonaktif.`
    );
    return null;
  }
  return { host, user, pass };
}

/**
 * Daftar port yang akan dicoba, berurutan.
 * - SMTP_PORT dieksplisitkan → hanya port itu (tanpa fallback) agar perilaku
 *   dapat dikunci operator.
 * - Jika tidak → 465 (SSL) lalu 587 (STARTTLS) lalu 25, karena sebagian
 *   jaringan/serverless memblokir salah satu port.
 */
function portCandidates(): number[] {
  const explicit = process.env.SMTP_PORT?.trim();
  if (explicit) {
    const port = Number(explicit);
    return Number.isFinite(port) && port > 0 ? [port] : [465];
  }
  return [...SMTP_PORT_FALLBACKS];
}

function buildTransporter(creds: SmtpCredentials, port: number): Transporter {
  // secure ditentukan oleh port (465 = SSL) atau eksplisit via SMTP_SECURE.
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  return nodemailer.createTransport({
    host: creds.host,
    port,
    secure,
    // Untuk port 587/STARTTLS, paksa upgrade ke TLS.
    requireTLS: !secure && port === 587,
    auth: { user: creds.user, pass: creds.pass },
    // Timeout agar request tidak menggantung saat email gagal.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailStatus = {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  /** Panjang App Password (bukan nilainya) — untuk memastikan 16 karakter. */
  passLength: number;
  from: string;
  missing: string[];
};

/**
 * Ringkasan konfigurasi SMTP tanpa membocorkan App Password.
 * Dipakai halaman diagnostik admin & pesan error agar akar masalah langsung
 * terlihat (variabel mana yang kosong, port/secure yang dipakai).
 */
export function getMailStatus(): MailStatus {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") || "";
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  const missing: string[] = [];
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  return {
    configured: missing.length === 0,
    host,
    port,
    secure,
    user,
    passLength: pass.length,
    from: process.env.SMTP_FROM ?? "EDULALIN",
    missing,
  };
}

/**
 * Kirim email. Mengembalikan { ok: true } bila terkirim, atau
 * { ok: false, error } bila konfigurasi / pengiriman gagal.
 */
export async function sendMail(
  input: SendMailInput
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const creds = readCredentials();
  if (!creds) {
    const status = getMailStatus();
    return {
      ok: false,
      error: `Konfigurasi email belum diatur (variabel ${status.missing.join(
        " & "
      )} kosong). Set Gmail App Password 16 karakter pada variabel tersebut.`,
    };
  }

  const fromName = process.env.SMTP_FROM ?? "EDULALIN";
  const from = `"${fromName}" <${creds.user}>`;
  const ports = portCandidates();
  let lastError = "Gagal mengirim email";

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];
    try {
      const info = await buildTransporter(creds, port).sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      if (i > 0) {
        console.info(`[mail] berhasil terkirim lewat port fallback ${port}`);
      }
      return { ok: true, messageId: info.messageId };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Gagal mengirim email";
      const next = ports[i + 1];
      if (next) {
        console.warn(`[mail] port ${port} gagal (${lastError}) — mencoba port ${next}`);
      }
    }
  }

  return { ok: false, error: lastError };
}

/** Buat kode OTP 6 digit acak. */
export function generateOtp(): string {
  const digits = new Uint32Array(1);
  crypto.getRandomValues(digits);
  return String(100000 + (digits[0] % 900000));
}

/**
 * Uji koneksi & autentikasi SMTP tanpa mengirim email.
 * Berguna untuk memastikan App Password benar sebelum pengguna diminta
 * menunggu email OTP yang tidak akan pernah datang.
 */
export async function verifyMailConnection(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const creds = readCredentials();
  if (!creds) {
    const status = getMailStatus();
    return {
      ok: false,
      error: `Variabel ${status.missing.join(" & ")} belum diisi`,
    };
  }

  let lastError = "Gagal terhubung ke server SMTP";
  for (const port of portCandidates()) {
    try {
      await buildTransporter(creds, port).verify();
      return { ok: true };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Gagal terhubung ke server SMTP";
    }
  }
  return { ok: false, error: lastError };
}
