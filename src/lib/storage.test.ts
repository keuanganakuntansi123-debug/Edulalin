import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { blobPathname, isAllowedMime, MAX_SIZES, BLOB_PREFIX, EMBED_MAX_BYTES, MB } from "@/lib/upload-config";
import { fileUrl, storedNameFromUrl } from "@/lib/storage";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

// storage.ts mengimpor prisma di module level; prisma.ts butuh DATABASE_URL.
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-test-secret";

describe("blobPathname", () => {
  it("menghasilkan pathname ber-prefix folder dan aman", () => {
    const t = blobPathname("SCHOOL_LOGO", "Logo SMK Negeri 1!.png");
    expect(t).toMatch(/^logos\/[a-z0-9]+-[a-z0-9]+-Logo_SMK_Negeri_1_.png$/);
    expect(t).not.toContain(" ");
  });

  it("semua jenis file memakai prefix yang benar", () => {
    expect(blobPathname("MODULE_CONTENT", "a.pdf")).toMatch(/^modules\//);
    expect(blobPathname("QUIZ_PDF", "a.pdf")).toMatch(/^quiz\//);
    expect(blobPathname("AVATAR", "a.png")).toMatch(/^avatars\//);
    expect(blobPathname("SITE_IMAGE", "a.png")).toMatch(/^site\//);
    expect(blobPathname("SCHOOL_LOGO", "a.png")).toMatch(/^logos\//);
  });

  it("menghasilkan pathname unik untuk pemanggilan berbeda", () => {
    const a = blobPathname("SCHOOL_LOGO", "logo.png");
    const b = blobPathname("SCHOOL_LOGO", "logo.png");
    expect(a).not.toBe(b);
  });

  it("BLOB_PREFIX cocok dengan dokumen & register route", () => {
    expect(BLOB_PREFIX.SCHOOL_LOGO).toBe("logos");
    expect(BLOB_PREFIX.AVATAR).toBe("avatars");
  });
});

describe("isAllowedMime", () => {
  it("mengizinkan format logo yang didukung", () => {
    expect(isAllowedMime("SCHOOL_LOGO", "image/jpeg")).toBe(true);
    expect(isAllowedMime("SCHOOL_LOGO", "image/png")).toBe(true);
    expect(isAllowedMime("SCHOOL_LOGO", "image/webp")).toBe(true);
  });

  it("menolak format lain", () => {
    expect(isAllowedMime("SCHOOL_LOGO", "image/svg+xml")).toBe(false);
    expect(isAllowedMime("SCHOOL_LOGO", "application/pdf")).toBe(false);
  });

  it("batas ukuran logo maksimal 50 MB", () => {
    expect(MAX_SIZES.SCHOOL_LOGO).toBe(50 * 1024 * 1024);
  });

  it("batas embed base64 lebih kecil dari batas unggah (jaga ukuran baris DB)", () => {
    expect(EMBED_MAX_BYTES).toBe(4 * MB);
    expect(EMBED_MAX_BYTES).toBeLessThan(MAX_SIZES.SCHOOL_LOGO);
    expect(EMBED_MAX_BYTES).toBeLessThan(MAX_SIZES.AVATAR);
    expect(EMBED_MAX_BYTES).toBeLessThan(MAX_SIZES.ARTICLE_IMAGE);
  });
});

describe("fileUrl / storedNameFromUrl", () => {
  it("membangun URL per-segmen untuk pathname blob ber-folder", () => {
    expect(fileUrl("logos/mvg4-logo-uji.png")).toBe(
      "/api/files/logos/mvg4-logo-uji.png"
    );
  });

  it("menangani segmen yang perlu encoding", () => {
    const url = fileUrl("logos/hélo logo 1!.png");
    // encodeURIComponent tidak meng-encode `!`, tetapi meng-encode spasi & aksen.
    expect(url).toContain("logos/h%C3%A9lo%20logo%201!.png");
  });

  it("mengembalikan storedName asli dari URL /api/files", () => {
    expect(storedNameFromUrl("/api/files/logos/mvg4-logo-uji.png")).toBe(
      "logos/mvg4-logo-uji.png"
    );
    expect(storedNameFromUrl("https://x.test/api/files/avatars/a.png")).toBe(
      "avatars/a.png"
    );
  });

  it("mengembalikan null untuk URL di luar /api/files", () => {
    expect(storedNameFromUrl("https://blob.example/x.png")).toBeNull();
    expect(storedNameFromUrl("")).toBeNull();
  });
});