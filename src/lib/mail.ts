import nodemailer, { type Transporter } from "nodemailer";

/**
 * Layanan email EDULALIN (Gmail SMTP via nodemailer).
 *
 * Dipakai untuk notifikasi:
 *  - pengajuan Lupa Password ke Admin
 *  - perubahan password berhasil ke pemilik akun
 *
 * Kredensial HANYA dibaca dari environment variables (server-side). Tidak ada
 * password yang pernah dikirim ke browser. Bila konfigurasi belum lengkap,
 * fungsi mengembalikan error yang aman (tanpa membocorkan kredensial) sehingga
 * alur aplikasi tetap berjalan dan Admin dapat mengirim ulang setelah SMTP
 * dikonfigurasi.
 */

export const MAIL_FROM_NAME = "EDULALIN — Edukasi Lalu Lintas";

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string | null;
};

export type MailSendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string | null;
};

export type MailSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export type MailStatus = {
  /** Semua variabel wajib terisi sehingga pengiriman dapat dilakukan. */
  configured: boolean;
  host: string;
  port: number;
  user: string;
  /** Panjang App Password (tanpa membocorkan nilainya). */
  passwordLength: number;
  secure: boolean;
  from: string;
  /** Daftar nama variabel wajib yang belum diisi. */
  missing: string[];
};

function envValue(...keys: string[]): string {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw && raw.trim()) return raw.trim();
  }
  return "";
}

function mailPort(): number {
  const explicit = Number(envValue("SMTP_PORT"));
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  return 465;
}

export function readMailConfig(): MailConfig | null {
  const host = envValue("SMTP_HOST") || "smtp.gmail.com";
  const port = mailPort();
  const user = envValue("SMTP_USER", "SMTP_USERNAME", "GMAIL_USER");
  const pass = envValue("SMTP_PASS", "SMTP_PASSWORD", "GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  const from = envValue("SMTP_FROM") || user;
  if (!user || !pass) return null;
  const secure = envValue("SMTP_SECURE")
    ? envValue("SMTP_SECURE").toLowerCase() === "true"
    : port === 465;
  return {
    host,
    port,
    secure,
    user,
    pass,
    from: from.includes("<") ? from : `${MAIL_FROM_NAME} <${from}>`,
    replyTo: envValue("SMTP_REPLY_TO") || null,
  };
}

/** Diagnostik aman (tanpa membocorkan password) untuk kartu pengaturan Admin. */
export function getMailStatus(): MailStatus {
  const host = envValue("SMTP_HOST") || "smtp.gmail.com";
  const port = mailPort();
  const user = envValue("SMTP_USER", "SMTP_USERNAME", "GMAIL_USER");
  const pass = envValue("SMTP_PASS", "SMTP_PASSWORD", "GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  const from = envValue("SMTP_FROM") || user;
  const missing: string[] = [];
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  return {
    configured: missing.length === 0,
    host,
    port,
    user,
    passwordLength: pass.length,
    secure: port === 465,
    from,
    missing,
  };
}

/** Template email konsisten dengan identitas EDULALIN. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type MailRow = { label: string; value: string };

/**
 * Bangun body email HTML dengan tabel data (tanggal, jam, identitas, dll).
 * `cta` opsional menambahkan tombol menuju aplikasi.
 */
export function buildMailHtml(params: {
  heading: string;
  intro: string;
  rows?: MailRow[];
  footer?: string;
  cta?: { label: string; url: string };
}): string {
  const rows = (params.rows ?? [])
    .filter((r) => r.value && r.value.trim().length > 0)
    .map(
      (r) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(
            r.label
          )}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${escapeHtml(
            r.value
          )}</td>
        </tr>`
    )
    .join("");

  const cta = params.cta
    ? `<a href="${escapeHtml(params.cta.url)}" style="display:inline-block;margin-top:18px;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;">${escapeHtml(
        params.cta.label
      )}</a>`
    : "";

  return `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0f172a;padding:20px 24px;">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:0.5px;">EDU<span style="color:#38bdf8;">LALIN</span></p>
        <p style="margin:2px 0 0;color:#94a3b8;font-size:12px;">Edukasi Lalu Lintas</p>
      </div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(params.heading)}</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
          params.intro
        )}</p>
        ${rows ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">${rows}</table>` : ""}
        ${cta}
        ${
          params.footer
            ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#64748b;">${escapeHtml(
                params.footer
              )}</p>`
            : ""
        }
      </div>
      <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Email otomatis dari sistem EDULALIN. Jangan balas email ini.</p>
      </div>
    </div>
  </body>
</html>`;
}

let cachedTransporter: { key: string; transporter: Transporter } | null = null;

function buildTransporter(config: MailConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}:${config.pass.length}`;
  if (cachedTransporter && cachedTransporter.key === key) return cachedTransporter.transporter;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure && config.port === 587,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  cachedTransporter = { key, transporter };
  return transporter;
}

/** Kirim satu email. Tidak pernah melempar — kegagalan dikembalikan sebagai pesan. */
export async function sendMail(input: MailSendInput): Promise<MailSendResult> {
  const config = readMailConfig();
  if (!config) {
    const status = getMailStatus();
    return {
      ok: false,
      error: `Konfigurasi email belum lengkap (${status.missing.join(", ") || "SMTP"} kosong).`,
    };
  }
  try {
    const info = await buildTransporter(config).sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo ?? config.replyTo ?? undefined,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Verifikasi koneksi SMTP (dipakai tombol uji di pengaturan Admin). */
export async function verifyMailConnection(): Promise<MailSendResult> {
  const config = readMailConfig();
  if (!config) {
    const status = getMailStatus();
    return {
      ok: false,
      error: `Konfigurasi email belum lengkap (${status.missing.join(", ") || "SMTP"} kosong).`,
    };
  }
  try {
    await buildTransporter(config).verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
