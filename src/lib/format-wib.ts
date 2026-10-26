/**
 * Format tanggal & jam zona waktu Indonesia bagian Barat (WIB, UTC+7).
 *
 * Seluruh notifikasi EDULALIN memakai format ini agar Admin dan pengguna di
 * berbagai zona waktu melihat tanggal/jam yang sama. Server Vercel berjalan
 * pada UTC, sehingga offset +7 jam diterapkan eksplisit.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function toWibDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(NaN);
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** "Senin, 26 Oktober 2026" */
export function formatDateWib(value: Date | string | number): string {
  const d = toWibDate(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14:35" */
export function formatTimeWib(value: Date | string | number): string {
  const d = toWibDate(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "Senin, 26 Oktober 2026 pukul 14:35 WIB" */
export function formatDateTimeWib(value: Date | string | number): string {
  const d = toWibDate(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${formatDateWib(value)} pukul ${formatTimeWib(value)} WIB`;
}

/** "26 Okt 2026, 14:35 WIB" — untuk daftar riwayat yang ringkas. */
export function formatDateTimeShortWib(value: Date | string | number): string {
  const d = toWibDate(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad(d.getUTCDate())} ${BULAN[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}, ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())} WIB`;
}
