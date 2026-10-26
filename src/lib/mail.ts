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
 */

function createTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  // App Password Gmail sering tersalin dengan spasi — buang semua whitespace.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn(
      "[mail] SMTP_USER / SMTP_PASS belum di-set — pengiriman email OTP nonaktif."
    );
    return null;
  }

  // secure ditentukan oleh port (465 = SSL) atau eksplisit via SMTP_SECURE.
  const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
  const secure = secureEnv ? secureEnv === "true" : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    // Untuk port 587/STARTTLS, paksa upgrade ke TLS.
    requireTLS: !secure && port === 587,
    auth: { user, pass },
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

/**
 * Kirim email. Mengembalikan { ok: true } bila terkirim, atau
 * { ok: false, error } bila konfigurasi / pengiriman gagal.
 */
export async function sendMail(
  input: SendMailInput
): Promise<{ ok: true; messageId?: string } | { ok: false; error: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    return { ok: false, error: "Konfigurasi email belum diatur (SMTP)" };
  }

  const fromName = process.env.SMTP_FROM ?? "EDULALIN";
  const from = process.env.SMTP_USER
    ? `"${fromName}" <${process.env.SMTP_USER}>`
    : `"${fromName}" <no-reply@edulalin.id>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal mengirim email",
    };
  }
}

/** Buat kode OTP 6 digit acak. */
export function generateOtp(): string {
  const digits = new Uint32Array(1);
  crypto.getRandomValues(digits);
  return String(100000 + (digits[0] % 900000));
}
