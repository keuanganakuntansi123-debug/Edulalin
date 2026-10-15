---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah CRUD modul, upload materi, progress membaca, atau scope konten modul — berisi aturan manajemen modul EDULALIN."
---

# Aturan Modul — EDULALIN

## Kelola Modul (Admin)

- Tambah, edit, hapus/arsipkan, aktif/nonaktifkan modul.
- Upload PDF/PPT/video/link dengan validasi (lihat `security.md`).
- Field: judul, deskripsi, thumbnail, jenjang (SD/SMP/SMA/SIM), kelas, target sekolah (atau global), urutan modul, durasi, status, preview.
- Tracking jumlah dibaca dan progress.
- Perubahan modul harus tersinkronisasi dengan tampilan murid sesuai scope.

## Scope Konten

- `school_id` diisi hanya jika modul khusus sekolah; jika kosong → global (tampil untuk semua sekolah yang memenuhi jenjang/kelas).
- Murid hanya melihat modul yang cocok dengan: sekolah, jenjang, kelas, status aktif, dan aturan umur (khusus SIM, lihat `sim-module.md`).

## Progress Membaca/Menonton

- Simpan progress di `module_progress` (per user per modul).
- Tampilkan persentase progress kepada murid.
- Hanya data progress milik user sendiri yang boleh dibaca user lain sesuai policy scope (guru = scope sekolah, admin = global).

## Kelola Modul oleh Role Lain

- GURU: hanya bisa melihat modul di sekolahnya; tidak boleh edit/hapus.
- POLISI: hanya melihat ringkasan modul yang dibuka/diselesaikan murid (read-only).
- MURID: hanya membuka modul sesuai scope-nya.

## UI

- Dashboard murid menampilkan modul tersedia, modul selesai, progress, dan rekomendasi materi.
- Sediakan empty state, loading state, error state (lihat `ui-ux.md`).