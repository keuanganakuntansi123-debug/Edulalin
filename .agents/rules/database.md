---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah skema Prisma, migration, relasi, index, constraint, atau struktur database — berisi entitas minimal dan aturan skema EDULALIN."
---

# Aturan Database — EDULALIN

## Stack

- PostgreSQL + Prisma ORM.
- Buat migration yang bisa dijalankan dari fresh database.
- Gunakan foreign key, index, enum untuk `Role`, `EducationLevel`, `Status`.
- Gunakan transaction untuk proses penting: submit quiz, perubahan user, restore, dll.

## Entitas Minimal

`users`, `schools`, `modules`, `module_progress`, `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`, `activity_logs`, `user_sessions`, `password_reset_tokens`, `verification_tokens`, `deleted_user_history` (atau `users.deleted_at` + audit logs), `school_memberships` (jika dibutuhkan untuk assignment ganda di masa depan).

## Struktur School

- `id`, `code`, `name`, `education_level`, `address`, `city`, `province`, `status`, `created_at`, `updated_at`.

## Struktur User

- `id`, `name`, `email`, `password_hash`, `role`, `birth_date`, `school_id`, `education_level`, `class_level`, `phone`, `verified_at`, `status`, `created_at`, `updated_at`, `deleted_at`.
- Unique constraint untuk email.
- Index pada `school_id`, `role`, `education_level`, `class_level`, `status`.

## Relasi

- School 1..N Users, School 1..N Modules.
- User 1..N ModuleProgress; Module 1..N ModuleProgress.
- Module 1..N Quizzes.
- Quiz 1..N QuizQuestions.
- Quiz 1..N QuizAttempts; QuizQuestion 1..N QuizAnswers; QuizAttempt 1..N QuizAnswers.
- User 1..N QuizAttempts; User 1..N ActivityLogs; School 1..N ActivityLogs.

## Konvensi

- Gunakan enum Prisma untuk role/status/education level; jangan string bebas.
- Semua query data pengguna/modul/progress/laporan wajib memuat scope sekolah & authorization (lihat `school-isolation.md`).
- Soft delete untuk user & data penting: isi `deleted_at`, jangan hapus fisik; histori dipertahankan.
- Activity/audit log menyimpan actor, action, entity, entity_id, metadata, timestamp, dan IP/user-agent bila kebijakan privasi mengizinkan.

## Dokumentasi

- Sediakan ERD Mermaid di `docs/DATABASE.md` berisi tabel, field, relationship, index, constraint.