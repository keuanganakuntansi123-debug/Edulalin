import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMailMock = vi.fn();
const verifyMock = vi.fn();
const createTransportMock = vi.fn((opts: unknown) => ({
  options: opts,
  sendMail: sendMailMock,
  verify: verifyMock,
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: (opts: unknown) => createTransportMock(opts) },
}));

const { sendMail, verifyMailConnection } = await import("@/lib/mail");

const KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
let saved: Record<string, string | undefined> = {};

/** Port yang dipakai pada tiap pemanggilan createTransport, berurutan. */
const usedPorts = () =>
  createTransportMock.mock.calls.map((c) => (c[0] as { port: number }).port);

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  createTransportMock.mockClear();
  sendMailMock.mockReset();
  verifyMock.mockReset();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("sendMail port fallback", () => {
  it("mencoba 465 lalu 587 sampai berhasil", async () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "abcdefghijklmnop";
    sendMailMock
      .mockImplementationOnce(() => {
        throw new Error("connect ECONNREFUSED 465");
      })
      .mockImplementationOnce(() => ({ messageId: "ok-587" }));

    const res = await sendMail({ to: "a@b.id", subject: "S", text: "T" });

    expect(res.ok).toBe(true);
    expect(usedPorts()).toEqual([465, 587]);
  });

  it("SMTP_PORT eksplisit tidak memakai fallback", async () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "abcdefghijklmnop";
    process.env.SMTP_PORT = "2525";
    sendMailMock.mockImplementation(() => {
      throw new Error("gagal");
    });

    const res = await sendMail({ to: "a@b.id", subject: "S", text: "T" });

    expect(res.ok).toBe(false);
    expect(usedPorts()).toEqual([2525]);
  });

  it("mengembalikan error terakhir bila semua port gagal", async () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "abcdefghijklmnop";
    sendMailMock.mockImplementation(() => {
      throw new Error("auth failed");
    });

    const res = await sendMail({ to: "a@b.id", subject: "S", text: "T" });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("auth failed");
    expect(usedPorts()).toEqual([465, 587, 25]);
  });

  it("tanpa kredensial mengembalikan pesan variabel yang kosong", async () => {
    const res = await sendMail({ to: "a@b.id", subject: "S", text: "T" });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("SMTP_USER");
      expect(res.error).toContain("SMTP_PASS");
    }
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("tidak memanggil transport saat App Password kosong", async () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "   ";

    const res = await sendMail({ to: "a@b.id", subject: "S", text: "T" });

    expect(res.ok).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();
  });
});

describe("verifyMailConnection", () => {
  it("gagal cepat tanpa kredensial", async () => {
    const res = await verifyMailConnection();
    expect(res.ok).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("memakai port fallback sampai verify berhasil", async () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "abcdefghijklmnop";
    verifyMock
      .mockImplementationOnce(() => {
        throw new Error("timeout");
      })
      .mockImplementationOnce(() => undefined);

    const res = await verifyMailConnection();

    expect(res.ok).toBe(true);
    expect(usedPorts()).toEqual([465, 587]);
  });
});
