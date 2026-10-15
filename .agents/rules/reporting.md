---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah laporan, statistik, chart, atau export Excel/PDF — berisi aturan reporting EDULALIN (Admin, Guru, Polisi)."
---

# Aturan Laporan & Statistik — EDULALIN

## Dashboard Admin (Ringkasan & Grafik)

- Total pengguna, murid, guru, sekolah, modul aktif, kuis, attempt kuis, pengguna aktif.
- Grafik: pengguna aktif, aktivitas belajar, penyelesaian modul, hasil kuis.
- Aktivitas sistem terbaru, modul terpopuler, sekolah terdaftar.

## Laporan Admin

- Laporan pengguna, sekolah terdaftar, modul, modul dibaca, progress murid, quiz.
- Per kuis: jumlah attempt, nilai rata-rata, nilai tertinggi/terendah, persentase kelulusan.
- Aktivitas per sekolah, aktivitas per jenjang.
- Export Excel dan PDF.
- Filter: tanggal, sekolah, jenjang, kelas.

## Dashboard Guru

- Total murid di sekolahnya, modul tersedia, progress pembelajaran, statistik quiz, aktivitas belajar, ringkasan per kelas, ringkasan per jenjang.
- Hanya data dalam sekolahnya (ditambah jenjang/kelas jika ditugaskan). Tidak boleh melihat sekolah lain.

## Dashboard Polisi (Pemantauan Read-Only)

- Total sekolah yang terpantau; daftar sekolah terdaftar; jumlah murid per sekolah; ringkasan aktivitas pembelajaran; ringkasan modul & kuis yang dikerjakan; statistik penyelesaian modul dan hasil kuis.
- Filter: sekolah, jenjang, kelas, modul, kuis, rentang tanggal.
- Baca-saja; data pribadi murid seminimal mungkin.

## Implementasi

- Gunakan Recharts untuk chart.
- Semua query laporan mengikuti scope role (lihat `rbac.md` & `school-isolation.md`).
- Export Excel/PDF dihasilkan server-side.
- Sediakan loading/skeleton dan empty state pada tabel & chart.