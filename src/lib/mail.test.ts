import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getMailStatus, generateOtp } from "@/lib/mail";

const KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getMailStatus", () => {
  it("menandai belum siap dan melaporkan variabel yang kosong", () => {
    const s = getMailStatus();
    expect(s.configured).toBe(false);
    expect(s.missing).toEqual(["SMTP_USER", "SMTP_PASS"]);
    expect(s.passLength).toBe(0);
  });

  it("siap saat SMTP_USER & SMTP_PASS terisi", () => {
    process.env.SMTP_USER = "pengirim@gmail.com";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    const s = getMailStatus();
    expect(s.configured).toBe(true);
    expect(s.missing).toEqual([]);
    // spasi pada App Password dibuang
    expect(s.passLength).toBe(16);
    expect(s.user).toBe("pengirim@gmail.com");
  });

  it("default smtp.gmail.com:465 dengan secure=true", () => {
    const s = getMailStatus();
    expect(s.host).toBe("smtp.gmail.com");
    expect(s.port).toBe(465);
    expect(s.secure).toBe(true);
  });

  it("port 587 memakai secure=false", () => {
    process.env.SMTP_PORT = "587";
    expect(getMailStatus().secure).toBe(false);
  });

  it("SMTP_SECURE eksplisit menimpa nilai port", () => {
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "true";
    expect(getMailStatus().secure).toBe(true);
  });
});

describe("generateOtp", () => {
  it("selalu 6 digit angka", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });
});
