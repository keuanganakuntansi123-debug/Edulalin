# Arsitektur

## Struktur Folder

```
web/
├─ prisma/
│  ├─ schema.prisma        # Skema DB
│  ├─ seed.ts              # Seed data demo
│  └─ prisma7.config.ts    # Konfigurasi Prisma 7
├─ src/
│  ├─ proxy.ts             # Middleware Next 16 (proteksi route berdasarkan JWT)
│  ├─ generated/prisma/    # Prisma Client (hasil generate)
│  ├─ lib/
│  │  ├─ prisma.ts         # Singleton Prisma + adapter pg
│  │  ├─ session-token.ts  # JWT + cookie (BEBAS Prisma — aman di edge)
│  │  ├─ session.ts        # getCurrentUser (DB) + re-export token utils
│  │  ├─ auth.ts           # login/register/logout, zodErrors
│  │  ├─ guards.ts         # requireRole, assertSameSchoolOrAdmin, canAccessContent
│  │  ├─ constants.ts      # role/label/age/dashboardPath
│  │  ├─ validations.ts    # Skema Zod
│  │  ├─ audit.ts          # logActivity (audit trail)
│  │  ├─ module-service.ts # Scope modul & aturan umur SIM
│  │  └─ quiz-service.ts   # Penilaian kuis server-side
│  ├─ app/
│  │  ├─ actions/          # Server actions (auth, admin, murid)
│  │  ├─ (public)/         # Halaman publik + layout
│  │  └─ dashboard/        # Dashboard per role (admin, guru, polisi, murid)
│  └─ components/
│     ├─ ui/               # Button, Card, Badge, Form, Table, Toaster
│     ├─ public/           # Header/Footer landing
│     ├─ dashboard/        # Shell, sidebar, topbar, breadcrumbs
│     └─ charts/           # Recharts (distribusi skor, statistik sekolah)
└─ docs/                   # Dokumentasi ini
```

## Alur Otorisasi

1. `proxy.ts` (edge) membaca cookie JWT via `session-token` (tanpa DB), memblokir
   `/dashboard` tanpa session dan redirect role ke dashboard-nya.
2. Setiap halaman dashboard memanggil `await requireRole("ADMIN" | ...)` di server.
3. `getCurrentUser()` membaca JWT lalu memuat user + sekolah dari DB
   (menolak user `deletedAt` atau `INACTIVE`).
4. Query data selalu menyertakan scope sekolah/level di server —
   klien tidak pernah menentukan akses.

## Pola Server Actions

- Form memakai `useActionState` (`loginAction`, `registerAction`, ...).
- Action mengembalikan `{ success, errors, message }` atau `{ error }` untuk
  diperlihatkan UI; action yang "melempar" dibungkus wrapper lokal dengan
  `"use server"` agar kompatibel dengan `<form action={}>`.
- Semua mutasi mencatat `logActivity(...)` (fire-and-forget) dan
  `revalidatePath()` setelah perubahan.

## Strategi Rendering

- Semua halaman dashboard & register menggunakan
  `export const instant = false` (blocking) karena memakai `cookies()`/DB —
  kompatibel dengan `cacheComponents` Next 16.
- Landing, tentang, kontak, login — statis/PPR.
- Footer menggunakan `<CurrentYear />` statis untuk menghindari nilai
  `new Date()` yang tidak stabil saat prerender.