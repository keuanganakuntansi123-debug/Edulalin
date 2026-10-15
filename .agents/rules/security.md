---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah endpoint, middleware, upload file, validasi input, atau hardening keamanan — berisi checklist keamanan wajib EDULALIN."
---

# Aturan Keamanan — EDULALIN

## Checklist Wajib

- RBAC server-side (lihat `rbac.md`) dan school isolation server-side (lihat `school-isolation.md`).
- CSRF protection sesuai arsitektur.
- Cookie secure: `HttpOnly`, `SameSite`, `Secure` di production.
- Password hashing: Argon2id atau bcrypt konfigurasi aman (cost factor memadai).
- Rate limiting: login, registrasi, reset password, dan endpoint sensitif.
- Validasi semua input dengan Zod (server-side, bukan hanya client).
- SQL injection protection: selalu lewat ORM/parameterized query, dilarang string concatenation.
- XSS protection: escape output, hindari `dangerouslySetInnerHTML` tanpa sanitasi.
- Upload file validation: MIME/type, ekstensi, ukuran maksimal, simpan di storage aman (bukan publicly writable), jangan eksekusi.
- Secure error messages: jangan tampilkan stack trace; gunakan kode error generik.
- Jangan bocorkan info "email terdaftar atau tidak" pada endpoint sensitif.
- Jangan tampilkan `password_hash` atau token pada respons API.
- Gunakan pagination, filtering, search, sorting pada tabel admin; jangan biarkan parameter tak tervalidasi langsung masuk query.

## Proteksi Route & API

- Semua route dashboard dilindungi middleware/session guard; cek peran di server.
- API harus mengembalikan `403`/`404` sesuai policy **tanpa membocorkan data** (mis. "tidak ditemukan" bukan "milik sekolah lain").
- Endpoint pembuatan akun: tolak permintaan yang mencoba memaksa role selain `MURID`.
- Modul SIM: validasi ulang umur di backend setiap akses (lihat `sim-module.md`).
- Nilai kuis dihitung ulang server-side — jangan pernah percaya nilai dari frontend (lihat `quiz.md`).

## Upload File

- Batasi tipe file (mis. PDF/PPT/video/image), ukuran maksimal, dan jalur penyimpanan.
- Validasi MIME dari isi file, bukan hanya ekstensi.
- Jangan menjalankan file yang di-upload; kirim sebagai static/stream dengan header aman.
- Simpan metadata (ukuran, tipe, pemilik) untuk audit.

## Penanganan Error

- Error message aman dan generik untuk user; detail lengkap hanya di log internal.
- Catat error penting ke activity log bila relevan.