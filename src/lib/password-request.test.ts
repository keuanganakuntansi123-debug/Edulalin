import { describe, it, expect } from "vitest";
import {
  verifyResetIdentity,
  normalizeIdentityText,
  validatePasswordStrength,
  identityFieldLabel,
} from "@/lib/password-request";

const baseMurid = {
  name: "Budi Santoso",
  email: "budi@edulalin.test",
  role: "MURID" as const,
  educationLevel: "SMA" as const,
  classLevel: "10",
  major: "MIPA",
  subject: null,
  policeLevel: null,
  policeUnit: null,
  policeDivision: null,
  school: { name: "SMAN 1 JAKARTA" },
};

describe("normalizeIdentityText", () => {
  it("mengabaikan kapitalisasi dan spasi berlebih", () => {
    expect(normalizeIdentityText("  sman   1  jakarta ")).toBe("SMAN 1 JAKARTA");
  });

  it("mengembalikan string kosong untuk null/undefined", () => {
    expect(normalizeIdentityText(null)).toBe("");
    expect(normalizeIdentityText(undefined)).toBe("");
  });
});

describe("verifyResetIdentity", () => {
  it("terverifikasi saat semua identitas cocok", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: "budi@edulalin.test",
      name: "BUDI SANTOSO",
      schoolName: "sman 1 jakarta",
      educationLevel: "SMA",
      classLevel: "10",
      major: "mipa",
    });
    expect(result.verified).toBe(true);
    expect(result.score).toBe(100);
    expect(result.mismatchFields).toHaveLength(0);
  });

  it("menolak saat nama tidak cocok", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: "budi@edulalin.test",
      name: "NAMA LAIN",
      schoolName: "SMAN 1 JAKARTA",
      educationLevel: "SMA",
      classLevel: "10",
      major: "MIPA",
    });
    expect(result.verified).toBe(false);
    expect(result.mismatchFields).toContain("name");
  });

  it("menolak saat mayoritas identitas tidak cocok", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: "budi@edulalin.test",
      name: "BUDI SANTOSO",
      schoolName: "SEKOLAH LAIN",
      educationLevel: "SD",
      classLevel: "11",
      major: "TKJ",
    });
    expect(result.verified).toBe(false);
    expect(result.score).toBeLessThan(60);
  });

  it("tidak menghukum pengguna dengan identitas minim (admin)", () => {
    const admin = {
      ...baseMurid,
      role: "ADMIN" as const,
      educationLevel: null,
      classLevel: null,
      major: null,
      school: null,
    };
    const result = verifyResetIdentity(admin, {
      email: "admin@edulalin.test",
      name: "Budi Santoso",
    });
    expect(result.verified).toBe(true);
    expect(result.applicableFields).toEqual(["name"]);
  });

  it("memeriksa identitas kepolisian", () => {
    const polisi = {
      ...baseMurid,
      role: "POLISI" as const,
      educationLevel: null,
      classLevel: null,
      major: null,
      policeLevel: "POLRES" as const,
      policeUnit: "POLRES METRO JAKARTA SELATAN",
      policeDivision: "SATLANTAS",
      school: null,
    };
    const ok = verifyResetIdentity(polisi, {
      email: "polisi@edulalin.test",
      name: "Budi Santoso",
      policeLevel: "POLRES",
      policeUnit: "polres metro jakarta selatan",
      policeDivision: "SATLANTAS",
    });
    expect(ok.verified).toBe(true);
    expect(ok.score).toBe(100);

    const bad = verifyResetIdentity(polisi, {
      email: "polisi@edulalin.test",
      name: "Budi Santoso",
      policeUnit: "POLRES LAIN",
    });
    expect(bad.mismatchFields).toContain("policeUnit");
  });
});

describe("identityFieldLabel", () => {
  it("menerjemahkan kode field ke label", () => {
    expect(identityFieldLabel("policeUnit")).toBe("Nama Kesatuan");
    expect(identityFieldLabel("unknownField")).toBe("unknownField");
  });
});

describe("validatePasswordStrength", () => {
  it("menolak password terlalu pendek", () => {
    expect(validatePasswordStrength("abc123")).toBe("Password baru minimal 8 karakter.");
  });

  it("menolak password tanpa angka", () => {
    expect(validatePasswordStrength("abcdefghij")).toBe(
      "Password baru wajib mengandung huruf dan angka."
    );
  });

  it("menolak konfirmasi yang berbeda", () => {
    expect(validatePasswordStrength("abcd1234", "beda9999")).toBe(
      "Konfirmasi password tidak sama."
    );
  });

  it("menolak password yang sama dengan nomor telepon", () => {
    expect(validatePasswordStrength("a0812345678", undefined, "0812345678")).toBe(
      "Password baru tidak boleh sama dengan nomor telepon terdaftar."
    );
  });

  it("menerima password kuat", () => {
    expect(validatePasswordStrength("Rahasia123", "Rahasia123", "0812345678")).toBeNull();
  });
});
