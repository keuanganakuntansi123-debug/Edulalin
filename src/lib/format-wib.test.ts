import { describe, it, expect } from "vitest";
import {
  formatDateWib,
  formatTimeWib,
  formatDateTimeWib,
  formatDateTimeShortWib,
} from "@/lib/format-wib";

describe("format-wib", () => {
  // 2026-10-26T07:35:00Z → 14:35 WIB
  const iso = "2026-10-26T07:35:00.000Z";

  it("menampilkan tanggal & hari dalam bahasa Indonesia (WIB)", () => {
    expect(formatDateWib(iso)).toBe("Senin, 26 Oktober 2026");
  });

  it("menampilkan jam WIB (+7 dari UTC)", () => {
    expect(formatTimeWib(iso)).toBe("14:35");
  });

  it("menampilkan tanggal & jam lengkap dengan zona WIB", () => {
    expect(formatDateTimeWib(iso)).toBe("Senin, 26 Oktober 2026 pukul 14:35 WIB");
  });

  it("format ringkas untuk riwayat", () => {
    expect(formatDateTimeShortWib(iso)).toBe("26 Okt 2026, 14:35 WIB");
  });

  it("tanggal invalid dikembalikan sebagai tanda strip", () => {
    expect(formatDateWib("bukan-tanggal")).toBe("-");
    expect(formatTimeWib("bukan-tanggal")).toBe("-");
  });

  it("menerima objek Date", () => {
    expect(formatTimeWib(new Date(iso))).toBe("14:35");
  });
});
