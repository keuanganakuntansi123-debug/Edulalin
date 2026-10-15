---
trigger: model_decision
description: "Terapkan saat menulis atau memperbarui dokumentasi — berisi struktur folder docs dan output akhir yang wajib disediakan EDULALIN."
---

# Aturan Dokumentasi — EDULALIN

## Folder `docs/`

Buat minimal file berikut:

- `README.md` — instalasi, environment variables, database setup, migration, seed, development, build production, deployment.
- `ARCHITECTURE.md` — keputusan arsitektur.
- `DATABASE.md` — ERD Mermaid, tabel, field, relationship, index, constraint.
- `RBAC.md` — matrix akses ADMIN/GURU/POLISI/MURID.
- `SCHOOL_ISOLATION.md` — aturan tenant/school scope, contoh SMA A vs SMA B, contoh authorization policy.
- `AUTHENTICATION.md` — alur login/registrasi/session/token.
- `MODULES.md` — manajemen modul & progress.
- `QUIZ.md` — kuis, penilaian server-side, attempt.
- `REPORTING.md` — laporan & statistik.
- `API.md` — endpoint & authorization.
- `DEPLOYMENT.md` — panduan deployment.
- `TESTING.md` — cara menjalankan test.
- `PRIVACY.md` — kebijakan data & audit.

## Output Akhir (ringkasan yang wajib disertakan)

- Struktur project.
- Stack yang digunakan.
- Cara menjalankan.
- Environment variables yang dibutuhkan.
- Migration command.
- Seed command.
- Akun demo.
- Route utama.
- Ringkasan fitur.
- Hasil test.
- Hasil build.
- Catatan keamanan.
- Catatan deployment.