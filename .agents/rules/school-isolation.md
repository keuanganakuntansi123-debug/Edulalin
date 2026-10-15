---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah query, API, komponen, atau test yang melibatkan data lintas pengguna/sekolah — berisi aturan wajib isolasi sekolah (multi-tenant) dan isolasi jenjang/kelas."
---

# Aturan Isolasi Sekolah (Multi-Tenant) — EDULALIN

## Prinsip Inti

Ini adalah fitur paling penting di EDULALIN. Semua data terikat pada scope sekolah:

- Murid SMA A HANYA melihat konten & data SMA A — tidak boleh melihat murid, guru, modul khusus, kuis khusus, atau laporan SMA B.
- Guru SMA A HANYA memonitor SMA A — tidak boleh membuka data SMA B meskipun mengubah URL/ID.
- ADMIN melihat semua sekolah (satu-satunya role dengan akses global penuh).
- POLISI lintas sekolah hanya melalui endpoint/menu pemantauan yang diizinkan, read-only.

## Aturan Wajib

1. Implementasikan `school_id` pada seluruh entity yang membutuhkan scope sekolah (users, modules, quizzes, attempts, laporan, dll.).
2. Gunakan authorization policy/server guard: ADMIN = global; GURU = school-scoped; POLISI = lintas sekolah read-only terbatas; MURID = school-scoped.
3. Jangan hanya melakukan filtering di frontend — setiap query di server harus menyertakan scope.
4. Konten global boleh memiliki `school_id = NULL` dan tampil ke sekolah yang memenuhi jenjang/kelas.
5. Konten school-specific wajib mencocokkan `school_id` dengan sekolah user.
6. Jika user mencoba mengubah `id` di URL, server harus tetap menolak akses (guard memakai scope dari session, bukan ID dari request).

## Pola Query yang Benar (contoh)

```ts
// Salah — mengandalkan school_id dari query param
const modules = await db.module.findMany({ where: { id: params.id } });

// Benar — scope diambil dari session, lalu dicocokkan
const user = await getSessionUser();
const module = await db.module.findFirst({
  where: { id: params.id, schoolId: user.schoolId },
});
```

## Aturan Per Role

| Role | Scope |
|---|---|
| ADMIN | Semua sekolah |
| GURU | `school_id` miliknya; tambahan jenjang/kelas jika ditugaskan |
| POLISI | Lintas sekolah, read-only, hanya endpoint pemantauan |
| MURID | `school_id` miliknya + jenjang + kelas |

## Pola Isolasi Jenjang/Kelas

- Entity konten memuat `education_level` (SD/SMP/SMA/SIM) dan bila perlu `class_level`.
- Query konten murid wajib memfilter jenjang & kelas, ditambah aturan umur (lihat `sim-module.md`).

## Test yang Harus Ada (detail di `testing.md`)

- Guru SMA A tidak dapat membaca data SMA B.
- Murid SMA A tidak dapat membaca data SMA B.
- Murid SMA A tidak dapat mengakses URL modul milik SMA B.
- Modul global terlihat sesuai jenjang/kelas.
- Modul khusus SMA A hanya terlihat oleh SMA A.