# Laporan & Statistik

## Halaman Laporan

- **ADMIN** `/dashboard/admin/reports` — agregasi global: jumlah attempt,
  tingkat kelulusan, rata-rata skor, total murid, statistik per modul,
  distribusi skor (chart).
- **GURU** `/dashboard/guru/reports` — sama, tetapi **hanya sekolah sendiri**.
- **POLISI** `/dashboard/polisi/statistik` — ringkasan lintas sekolah
  (read-only), termasuk grafik per sekolah.

## Data yang Dihitung

- `QuizAttempt` berstatus `COMPLETED`.
- Pass rate = jumlah `passed` / total attempt × 100.
- Rata-rata skor = Σ score / jumlah attempt.
- Distribusi skor: 10 bucket (0–9, 10–19, ..., 90–100).
- Statistik modul: jumlah progress `completed` per modul.

## Prinsip

- Semua agregasi dijalankan di server (Prisma) dengan scope sesuai role.
- Halaman laporan memanggil `requireRole(...)` terlebih dahulu.
- POLISI tidak ikut dalam `assertSameSchoolOrAdmin` (lintas sekolah read-only),
  namun tidak memiliki aksi mutasi.

## Export (rencana)

Dokumen export Excel/PDF dapat ditambahkan kemudian — harus tetap
menjalankan otorisasi di server dan tidak boleh mengekspor data lintas
sekolah untuk GURU/MURID.