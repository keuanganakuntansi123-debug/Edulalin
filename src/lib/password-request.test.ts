import { describe, it, expect } from "vitest";
import {
  verifyResetIdentity,
  normalizeIdentityText,
  validatePasswordStrength,
  identityFieldLabel,
  IDENTITY_MISMATCH_MESSAGE,
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

describe("IDENTITY_MISMATCH_MESSAGE", () => {
  it("memakai kalimat resmi sesuai ketentuan", () => {
    expect(IDENTITY_MISMATCH_MESSAGE).toBe(
      "Data identitas tidak sesuai dengan data akun terdaftar."
    );
  });
});

describe("verifyResetIdentity — toleransi & ketelitian detail", () => {
  it("mencocokkan nama dengan gelar / singkatan", () => {
    const result = verifyResetIdentity(
      { ...baseMurid, name: "BUDI SANTOSO, S.PD" },
      { email: baseMurid.email, name: "budi santoso" }
    );
    expect(result.matchedFields).toContain("name");
    expect(result.verified).toBe(true);
  });

  it("mencocokkan sekolah dengan singkatan NEgeri/Sekolah", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: baseMurid.email,
      name: "BUDI SANTOSO",
      schoolName: "SMA NEGERI 1 JAKARTA",
    });
    expect(result.matchedFields).toContain("school");
    expect(result.mismatchFields).not.toContain("school");
  });

  it("menolak kelas yang berbeda (detail harus persis)", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: baseMurid.email,
      name: "BUDI SANTOSO",
      classLevel: "11",
    });
    expect(result.mismatchFields).toContain("classLevel");
    expect(result.verified).toBe(false);
  });

  it("menolak jurusan yang berbeda untuk SMA/SMK", () => {
    const result = verifyResetIdentity(baseMurid, {
      email: baseMurid.email,
      name: "BUDI SANTOSO",
      major: "TKJ",
    });
    expect(result.mismatchFields).toContain("major");
    expect(result.verified).toBe(false);
  });

  it("mengabaikan jurusan untuk murid SD/SMP", () => {
    const sdMurid = {
      ...baseMurid,
      educationLevel: "SD" as const,
      classLevel: "5",
      major: "SDN 5",
    };
    const result = verifyResetIdentity(sdMurid, {
      email: sdMurid.email,
      name: "BUDI SANTOSO",
      classLevel: "5",
      major: "APAPUN",
    });
    expect(result.applicableFields).not.toContain("major");
    expect(result.verified).toBe(true);
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
