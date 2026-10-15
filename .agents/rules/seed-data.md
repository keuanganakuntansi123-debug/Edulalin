---
trigger: model_decision
description: "Terapkan saat membuat atau memperbarui seed data atau akun demo — berisi daftar seed wajib EDULALIN."
---

# Aturan Seed Data — EDULALIN

## Isi Seed Wajib

- 1 admin.
- 2 sekolah berbeda (mis. SMA A dan SMA B).
- 1 guru per sekolah (dibuat oleh admin, bukan registrasi publik).
- 1 akun polisi demo (dibuat admin, akses pemantauan read-only).
- Beberapa murid dengan kelas berbeda.
- Modul SD/SMP/SMA + modul SIM.
- Beberapa kuis dan soal.
- Sample attempts.
- Activity logs.

## Aturan

- Gunakan akun demo yang jelas ditandai sebagai DEMO, jangan gunakan password production.
- Password tetap di-hash sesuai aturan keamanan.
- Pastikan data seed konsisten dengan isolasi sekolah (tiap sekolah punya data sendiri).
- Seed harus bisa dijalankan dari database fresh; pastikan berhasil sebelum menyatakan selesai.