---
trigger: model_decision
description: "Terapkan saat mengerjakan login, registrasi, session, token, verifikasi akun, reset password, atau pembuatan akun GURU/POLISI oleh Admin — berisi alur autentikasi aman EDULALIN."
---

# Aturan Autentikasi — EDULALIN

## Alur Umum

- Gunakan Auth.js/NextAuth atau sistem autentikasi aman setara dengan cookie `HttpOnly`, `SameSite`, dan konfigurasi secure.
- Simpan session di server/database (`user_sessions`), jangan hanya di localStorage.
- Terapkan rate limiting pada login, registrasi, dan endpoint sensitif.
- Jangan membocorkan pada endpoint sensitif apakah sebuah email terdaftar atau tidak (gunakan pesan generik).
- Password wajib di-hash dengan Argon2id atau bcrypt konfigurasi aman. Dilarang menyimpan plaintext.

## Registrasi Publik (hanya MURID)

Form registrasi publik menerima:

- Nama lengkap, tanggal lahir (wajib), sekolah, jenjang, kelas, email, nomor telepon, password + konfirmasi, persetujuan syarat & kebijakan privasi.

Aturan wajib:

- Role otomatis `MURID` dan ditetapkan oleh **server**; form publik TIDAK menampilkan pilihan role.
- Endpoint registrasi harus menolak manipulasi yang memaksa role selain `MURID`.
- Setelah daftar, akun memerlukan verifikasi (token verifikasi di `verification_tokens`).
- Jangan izinkan pengguna memilih role `ADMIN`, `GURU`, atau `POLISI` melalui form publik.

## Pembuatan Akun GURU & POLISI (oleh Admin)

- Hanya Admin yang membuat akun GURU dan POLISI melalui menu Kelola Pengguna.
- Guru: Admin menetapkan role, sekolah, dan bila perlu jenjang/kelas tanggung jawab.
- Polisi: Admin menetapkan status aktif dan lingkup pemantauan; default read-only lintas sekolah.
- Tidak ada halaman registrasi publik untuk GURU/POLISI.
- Lindungi endpoint pembuatan akun di backend agar role selain `MURID` tidak dibuat melalui request manipulasi.

## Login & Sesi

- Login memakai email + password; validasi di server dengan Zod/React Hook Form di sisi form.
- Gunakan `user_sessions` untuk sesi; tampilkan riwayat/aktivitas login di activity log.
- User yang berstatus nonaktif atau `deleted_at` terisi tidak boleh login (lihat `audit-log.md`).

## Lupa Password & Verifikasi

- `password_reset_tokens` untuk reset password dengan token sekali pakai (expiry).
- `verification_tokens` untuk verifikasi akun.
- Reset password lewat alur aman: user meminta reset → email berisi token → halaman reset dengan password baru → hash ulang.
- Sertakan timestamp dan pencatatan aktivitas.

## Aturan Pendukung

- Semua input divalidasi (Zod); error message generik dan aman.
- Jangan pernah meletakkan `password_hash` pada respons API (select field yang aman saja).
- Sertakan test: user yang di-soft-delete tidak dapat login; restore mengaktifkan kembali sesuai policy.