import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { getAge, dashboardPath, LEVEL_LABEL, ROLE_LABEL, CLASS_OPTIONS, normalizeEducationLevel } from "@/lib/constants";
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