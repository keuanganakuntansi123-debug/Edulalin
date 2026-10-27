import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import {
  getAge,
  dashboardPath,
  LEVEL_LABEL,
  ROLE_LABEL,
  CLASS_OPTIONS,
  normalizeEducationLevel,
  contentLevelsForMurid,
  simAllowedForLevel,
  validateSchoolLevelMatch,
  categoryOf,
  validateSchoolName,
  detectSchoolType,
  schoolPrefixFor,
  normalizeIdentityName,
  classOptionsForLevel,
} from "@/lib/constants";
import { canAccessSim } from "@/lib/module-service";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("getAge", () => {
  it("menghitung umur tepat saat ulang tahun", () => {
    const birthDate = new Date("2006-05-10");
    const today = new Date("2025-05-10");
    expect(getAge(birthDate, today)).toBe(19);
  });

  it("belum bertambah umur sebelum tanggal ulang tahun", () => {
    const birthDate = new Date("2006-05-10");
    const today = new Date("2025-05-09");
    expect(getAge(birthDate, today)).toBe(18);
  });

  it("bertambah umur setelah tanggal ulang tahun", () => {
    const birthDate = new Date("2006-05-10");
    const today = new Date("2025-05-11");
    expect(getAge(birthDate, today)).toBe(19);
  });
});

describe("canAccessSim", () => {
  it("menolak murid tanpa tanggal lahir", () => {
    expect(canAccessSim(null)).toBe(false);
    expect(canAccessSim(undefined)).toBe(false);
  });

  it("menolak murid berusia di bawah 17 tahun", () => {
    expect(canAccessSim(new Date("2015-01-01"))).toBe(false);
  });

  it("mengizinkan murid tepat berusia 17 tahun", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 17);
    expect(canAccessSim(birthDate)).toBe(true);
  });

  it("mengizinkan murid berusia di atas 17 tahun", () => {
    expect(canAccessSim(new Date("2006-05-10"))).toBe(true);
  });
});

describe("dashboardPath", () => {
  it("memetakan role ke route dashboard", () => {
    expect(dashboardPath("ADMIN")).toBe("/dashboard/admin");
    expect(dashboardPath("GURU")).toBe("/dashboard/guru");
    expect(dashboardPath("POLISI")).toBe("/dashboard/polisi");
    expect(dashboardPath("MURID")).toBe("/dashboard/murid");
  });

  it("fallback ke murid untuk role tak dikenal", () => {
    expect(dashboardPath("SOMETHING" as string)).toBe("/dashboard/murid");
  });
});

describe("label konstan", () => {
  it("memetakan semua level pendidikan", () => {
    expect(LEVEL_LABEL).toEqual({ SD: "SD", SMP: "SMP", SMA: "SMA", SMK: "SMK", SIM: "SIM" });
  });

  it("memetakan semua role", () => {
    expect(ROLE_LABEL.ADMIN).toBe("Admin");
    expect(ROLE_LABEL.MURID).toBe("Murid");
  });

  it("menyediakan opsi kelas lengkap", () => {
    expect(CLASS_OPTIONS).toContain("10");
    expect(CLASS_OPTIONS).toContain("1");
  });
});

describe("normalizeEducationLevel", () => {
  it("mengenali singkatan SD", () => {
    expect(normalizeEducationLevel("SD")).toBe("SD");
    expect(normalizeEducationLevel("sd")).toBe("SD");
    expect(normalizeEducationLevel("SDN 01 Cikini")).toBe("SD");
  });

  it("mengenali jenjang SMP", () => {
    expect(normalizeEducationLevel("SMP")).toBe("SMP");
    expect(normalizeEducationLevel("smp negeri 2")).toBe("SMP");
  });

  it("mengenali jenjang SMA/SMK", () => {
    expect(normalizeEducationLevel("SMA")).toBe("SMA");
    expect(normalizeEducationLevel("SMK Negeri 1")).toBe("SMK");
    expect(normalizeEducationLevel("SMK")).toBe("SMK");
    expect(normalizeEducationLevel("Sekolah Menengah Kejuruan")).toBe("SMK");
    expect(normalizeEducationLevel("Madrasah Aliyah")).toBe("SMA");
  });

  it("mengenali SIM", () => {
    expect(normalizeEducationLevel("SIM")).toBe("SIM");
    expect(normalizeEducationLevel("Surat Izin Mengemudi")).toBe("SIM");
  });

  it("fallback dari kelas jika jenjang tidak dikenali", () => {
    expect(normalizeEducationLevel("", "3")).toBe("SD");
    expect(normalizeEducationLevel("", "8")).toBe("SMP");
    expect(normalizeEducationLevel("", "12")).toBe("SMA");
  });

  it("default ke SMA jika tidak bisa ditentukan", () => {
    expect(normalizeEducationLevel("", "")).toBe("SMA");
    expect(normalizeEducationLevel("xyz", "abc")).toBe("SMA");
  });
});

describe("contentLevelsForMurid", () => {
  it("SD hanya melihat konten SD", () => {
    expect(contentLevelsForMurid("SD")).toEqual(["SD"]);
  });

  it("SMP hanya melihat konten SMP", () => {
    expect(contentLevelsForMurid("SMP")).toEqual(["SMP"]);
  });

  it("SMA melihat SMA + SIM (subtype)", () => {
    expect(contentLevelsForMurid("SMA")).toEqual(["SMA", "SIM"]);
  });

  it("SMK melihat SMK + SIM (subtype)", () => {
    expect(contentLevelsForMurid("SMK")).toEqual(["SMK", "SIM"]);
  });

  it("tidak pernah mencampur SD/SMP dengan SMA/SMK", () => {
    expect(contentLevelsForMurid("SD")).not.toContain("SMA");
    expect(contentLevelsForMurid("SMP")).not.toContain("SMK");
    expect(contentLevelsForMurid("SMA")).not.toContain("SD");
    expect(contentLevelsForMurid("SMK")).not.toContain("SMP");
  });
});

describe("simAllowedForLevel", () => {
  it("hanya SMA/SMK yang boleh konten SIM", () => {
    expect(simAllowedForLevel("SMA")).toBe(true);
    expect(simAllowedForLevel("SMK")).toBe(true);
    expect(simAllowedForLevel("SIM")).toBe(true);
    expect(simAllowedForLevel("SD")).toBe(false);
    expect(simAllowedForLevel("SMP")).toBe(false);
    expect(simAllowedForLevel(null)).toBe(false);
  });
});

describe("validateSchoolLevelMatch", () => {
  it("lulus bila semua sekolah tujuan sesuai kategori", () => {
    expect(validateSchoolLevelMatch("SMA", ["SMA", "SMA"])).toBeNull();
    expect(validateSchoolLevelMatch("SD", ["SD"])).toBeNull();
    expect(validateSchoolLevelMatch("SMK", ["SMK", "SMK"])).toBeNull();
  });

  it("menolak sekolah tujuan dengan jenjang berbeda", () => {
    expect(validateSchoolLevelMatch("SD", ["SMA"])).toContain("tidak cocok");
    expect(validateSchoolLevelMatch("SMA", ["SMK", "SMA"])).toContain("tidak cocok");
    expect(validateSchoolLevelMatch("SMP", ["SD"])).toContain("tidak cocok");
  });

  it("menolak kategori yang bukan SD/SMP/SMA/SMK", () => {
    expect(validateSchoolLevelMatch("SIM", ["SMA"])).toContain("SD, SMP, SMA");
  });

  it("mengabaikan nilai null", () => {
    expect(validateSchoolLevelMatch("SMA", [null, "SMA"])).toBeNull();
  });
});

describe("categoryOf", () => {
  it("SIM dipetakan ke kategori SMA (subtype)", () => {
    expect(categoryOf("SIM")).toBe("SMA");
    expect(categoryOf("SD")).toBe("SD");
    expect(categoryOf("SMK")).toBe("SMK");
    expect(categoryOf(null)).toBe("SMA");
  });
});

describe("normalizeIdentityName", () => {
  it("mengubah ke huruf kapital dan merapikan spasi", () => {
    expect(normalizeIdentityName("  smkn   15  jakarta ")).toBe("SMKN 15 JAKARTA");
    expect(normalizeIdentityName(null)).toBe("");
  });
});

describe("schoolPrefixFor", () => {
  it("memberi prefiks negeri & swasta per jenjang", () => {
    expect(schoolPrefixFor("SD", "NEGERI")).toBe("SDN");
    expect(schoolPrefixFor("SMP", "SWASTA")).toBe("SMPS");
    expect(schoolPrefixFor("SMA", "NEGERI")).toBe("SMAN");
    expect(schoolPrefixFor("SMK", "SWASTA")).toBe("SMKS");
  });

  it("null untuk jenjang tak dikenal", () => {
    expect(schoolPrefixFor("SIM", "NEGERI")).toBeNull();
    expect(schoolPrefixFor(null, "SWASTA")).toBeNull();
  });
});

describe("detectSchoolType", () => {
  it("mengenali sekolah negeri", () => {
    expect(detectSchoolType("SDN BUDI LUHUR")).toBe("NEGERI");
    expect(detectSchoolType("smpn 13 jakarta")).toBe("NEGERI");
    expect(detectSchoolType("SMKN 15 JAKARTA")).toBe("NEGERI");
  });

  it("mengenali sekolah swasta", () => {
    expect(detectSchoolType("SDS TUNAS HARAPAN")).toBe("SWASTA");
    expect(detectSchoolType("SMKS BUDI LUHUR")).toBe("SWASTA");
  });

  it("null bila prefiks tidak dikenali", () => {
    expect(detectSchoolType("SEKOLAH BEBAS")).toBeNull();
    expect(detectSchoolType("")).toBeNull();
  });
});

describe("validateSchoolName", () => {
  it("menerima sekolah negeri & swasta sesuai format", () => {
    expect(validateSchoolName("smkn 15 jakarta").ok).toBe(true);
    expect(validateSchoolName("SMKS BUDI LUHUR").ok).toBe(true);
    expect(validateSchoolName("SDN BUDI LUHUR").schoolType).toBe("NEGERI");
    expect(validateSchoolName("SMPS HARAPAN").schoolType).toBe("SWASTA");
  });

  it("mengembalikan nama ternormalisasi", () => {
    expect(validateSchoolName("  sman   82  jakarta ").normalized).toBe("SMAN 82 JAKARTA");
  });

  it("menolak nama tanpa prefiks resmi", () => {
    const res = validateSchoolName("SEKOLAH BEBAS");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Format nama sekolah");
  });

  it("menolak bila jenjang tidak cocok dengan prefiks", () => {
    const res = validateSchoolName("SMKN 15 JAKARTA", "SD");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("SMK");
  });

  it("menerima bila jenjang cocok dengan prefiks", () => {
    expect(validateSchoolName("SMKN 15 JAKARTA", "SMK").ok).toBe(true);
  });
});

describe("classOptionsForLevel", () => {
  it("SD 1-6, SMP 7-9, SMA/SMK 10-12", () => {
    expect(classOptionsForLevel("SD")).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(classOptionsForLevel("SMP")).toEqual(["7", "8", "9"]);
    expect(classOptionsForLevel("SMA")).toEqual(["10", "11", "12"]);
    expect(classOptionsForLevel("SMK")).toEqual(["10", "11", "12"]);
  });

  it("kosong bila jenjang belum dipilih", () => {
    expect(classOptionsForLevel("")).toEqual([]);
    expect(classOptionsForLevel(null)).toEqual([]);
    expect(classOptionsForLevel("SIM")).toEqual([]);
  });
});