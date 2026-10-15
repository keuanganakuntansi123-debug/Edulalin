import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { assertSameSchoolOrAdmin, canAccessContent } from "@/lib/guards";
import type { EducationLevel } from "@/generated/prisma/client";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
  getSessionPayload: vi.fn(),
}));

type TestRole = "ADMIN" | "GURU" | "POLISI" | "MURID";
type TestUser = {
  role: TestRole;
  schoolId: string | null;
  educationLevel: EducationLevel | null;
  classLevel: string | null;
};

type TestContent = {
  schoolId: string | null;
  educationLevel: EducationLevel;
  classLevel: string | null;
};

describe("assertSameSchoolOrAdmin", () => {
  const admin: TestUser = { role: "ADMIN", schoolId: null, educationLevel: null, classLevel: null };
  const guru: TestUser = { role: "GURU", schoolId: "school-a", educationLevel: "SMA", classLevel: null };
  const murid: TestUser = { role: "MURID", schoolId: "school-a", educationLevel: "SMA", classLevel: "11" };

  it("admin selalu diizinkan", () => {
    expect(assertSameSchoolOrAdmin(admin, "school-b")).toBe(true);
    expect(assertSameSchoolOrAdmin(admin, null)).toBe(true);
  });

  it("guru hanya untuk sekolah sendiri", () => {
    expect(assertSameSchoolOrAdmin(guru, "school-a")).toBe(true);
    expect(assertSameSchoolOrAdmin(guru, "school-b")).toBe(false);
  });

  it("konten global (tanpa sekolah) diizinkan untuk semua", () => {
    expect(assertSameSchoolOrAdmin(guru, null)).toBe(true);
    expect(assertSameSchoolOrAdmin(murid, undefined)).toBe(true);
  });

  it("murid tidak boleh melihat sekolah lain", () => {
    expect(assertSameSchoolOrAdmin(murid, "school-b")).toBe(false);
  });
});

describe("canAccessContent", () => {
  const admin: TestUser = { role: "ADMIN", schoolId: null, educationLevel: null, classLevel: null };
  const muridSMA: TestUser = {
    role: "MURID",
    schoolId: "school-a",
    educationLevel: "SMA",
    classLevel: "11",
  };
  const guruA: TestUser = {
    role: "GURU",
    schoolId: "school-a",
    educationLevel: "SMA",
    classLevel: null,
  };

  const kontenGlobalSMA: TestContent = { schoolId: null, educationLevel: "SMA", classLevel: null };
  const kontenKelas11: TestContent = { schoolId: null, educationLevel: "SMA", classLevel: "11" };
  const kontenKelas12: TestContent = { schoolId: null, educationLevel: "SMA", classLevel: "12" };
  const kontenSekolahB: TestContent = { schoolId: "school-b", educationLevel: "SMA", classLevel: null };

  it("admin dapat mengakses semua konten", () => {
    expect(canAccessContent({ user: admin, content: kontenSekolahB })).toBe(true);
  });

  it("murid dapat mengakses konten global sesuai jenjang", () => {
    expect(canAccessContent({ user: muridSMA, content: kontenGlobalSMA })).toBe(true);
  });

  it("murid hanya dapat mengakses kelasnya sendiri", () => {
    expect(canAccessContent({ user: muridSMA, content: kontenKelas11 })).toBe(true);
    expect(canAccessContent({ user: muridSMA, content: kontenKelas12 })).toBe(false);
  });

  it("murid dilarang mengakses konten sekolah lain", () => {
    expect(canAccessContent({ user: muridSMA, content: kontenSekolahB })).toBe(false);
  });

  it("guru dapat mengakses konten global tanpa batasan kelas", () => {
    expect(canAccessContent({ user: guruA, content: kontenKelas12 })).toBe(true);
  });
});