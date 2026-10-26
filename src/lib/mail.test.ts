import { describe, it, expect, afterEach } from "vitest";
import {
  buildMailHtml,
  escapeHtml,
  getMailStatus,
  readMailConfig,
  MAIL_FROM_NAME,
} from "@/lib/mail";

const SMTP_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_USERNAME",
  "GMAIL_USER",
  "SMTP_PASS",
  "SMTP_PASSWORD",
  "GMAIL_APP_PASSWORD",
  "SMTP_FROM",
  "SMTP_REPLY_TO",
];

const original = new Map<string, string | undefined>();

function snapshotEnv() {
  for (const key of SMTP_KEYS) original.set(key, process.env[key]);
}

function clearSmtpEnv() {
  for (const key of SMTP_KEYS) delete process.env[key];
}

function restoreEnv() {
  for (const [key, value] of original.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("mail", () => {
  snapshotEnv();

  afterEach(() => {
    clearSmtpEnv();
    restoreEnv();
  });

  describe("escapeHtml", () => {
    it("meng-escape karakter berbahaya", () => {
      expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe(
        "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;"
      );
    });
  });

  describe("readMailConfig", () => {
    it("mengembalikan null bila kredensial belum diisi", () => {
      clearSmtpEnv();
      expect(readMailConfig()).toBeNull();
    });

    it("mengembalikan null bila hanya user terisi", () => {
      clearSmtpEnv();
      process.env.SMTP_USER = "admin@edulalin.com";
      expect(readMailConfig()).toBeNull();
    });

    it("membangun konfigurasi lengkap dari env", () => {
      clearSmtpEnv();
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "admin@edulalin.com";
      process.env.SMTP_PASS = "abcd efgh ijkl mnop";
      process.env.SMTP_SECURE = "false";

      const config = readMailConfig();
      expect(config).not.toBeNull();
      expect(config?.host).toBe("smtp.gmail.com");
      expect(config?.port).toBe(587);
      expect(config?.secure).toBe(false);
      expect(config?.user).toBe("admin@edulalin.com");
      // spasi pada App Password dibersihkan
      expect(config?.pass).toBe("abcdefghijklmnop");
      expect(config?.from).toContain(MAIL_FROM_NAME);
      expect(config?.from).toContain("admin@edulalin.com");
    });

    it("memakai alias GMAIL_USER / GMAIL_APP_PASSWORD", () => {
      clearSmtpEnv();
      process.env.GMAIL_USER = "guru@edulalin.com";
      process.env.GMAIL_APP_PASSWORD = "secretpass";
      const config = readMailConfig();
      expect(config?.user).toBe("guru@edulalin.com");
      expect(config?.pass).toBe("secretpass");
    });

    it("default ke port 465 (secure) bila SMTP_PORT kosong", () => {
      clearSmtpEnv();
      process.env.SMTP_USER = "a@b.com";
      process.env.SMTP_PASS = "x";
      const config = readMailConfig();
      expect(config?.port).toBe(465);
      expect(config?.secure).toBe(true);
    });
  });

  describe("getMailStatus", () => {
    it("menandai belum terkonfigurasi tanpa membocorkan password", () => {
      clearSmtpEnv();
      const status = getMailStatus();
      expect(status.configured).toBe(false);
      expect(status.missing).toContain("SMTP_USER");
      expect(status.missing).toContain("SMTP_PASS");
      expect(status.passwordLength).toBe(0);
    });

    it("menandai terkonfigurasi dan hanya melaporkan panjang password", () => {
      clearSmtpEnv();
      process.env.SMTP_USER = "admin@edulalin.com";
      process.env.SMTP_PASS = "12345678";
      const status = getMailStatus();
      expect(status.configured).toBe(true);
      expect(status.user).toBe("admin@edulalin.com");
      expect(status.passwordLength).toBe(8);
      expect(JSON.stringify(status)).not.toContain("12345678");
    });
  });

  describe("buildMailHtml", () => {
    it("menyusun HTML dengan judul, baris data, dan CTA", () => {
      const html = buildMailHtml({
        heading: "Permintaan Reset Password",
        intro: "Ada permintaan baru.",
        rows: [
          { label: "Nama", value: "Budi" },
          { label: "Sekolah", value: "SMAN 1" },
        ],
        cta: { label: "Buka", url: "https://edulalin.com/dashboard" },
        footer: "Segera proses.",
      });
      expect(html).toContain("Permintaan Reset Password");
      expect(html).toContain("Budi");
      expect(html).toContain("SMAN 1");
      expect(html).toContain("https://edulalin.com/dashboard");
      expect(html).toContain("Segera proses.");
    });

    it("meng-escape nilai yang berpotensi berbahaya", () => {
      const html = buildMailHtml({
        heading: "Halo",
        intro: "Tes",
        rows: [{ label: "Nama", value: "<script>alert(1)</script>" }],
      });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("membuang baris data yang kosong", () => {
      const html = buildMailHtml({
        heading: "Halo",
        intro: "Tes",
        rows: [
          { label: "Nama", value: "Ani" },
          { label: "Kosong", value: "   " },
        ],
      });
      expect(html).toContain("Ani");
      expect(html).not.toContain("Kosong");
    });

    it("tanpa CTA tidak menambahkan tombol", () => {
      const html = buildMailHtml({ heading: "Halo", intro: "Tes" });
      expect(html).not.toContain("<a href=");
    });
  });
});
