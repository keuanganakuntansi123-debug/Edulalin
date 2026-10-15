# EDULALIN — Web

Edukasi Lalu Lintas: "Belajar Aman di Jalan". Platform edukasi keselamatan lalu lintas
untuk Jasa Raharja, sekolah, dan kepolisian: materi digital, kuis interaktif,
pemantauan pembelajaran, dan laporan statistik.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS 4
- shadcn/ui-style components (Radix Slot, lucide-react, recharts)
- PostgreSQL + Prisma ORM 7 (adapter `@prisma/adapter-pg`)
- Auth custom JWT (`jose`, HS256, cookie `edulalin_session`) + bcryptjs
- Zod v4 + React Hook Form, server actions
- Vitest untuk unit test

## Cara Menjalankan

```bash
npm install
cp .env.example .env        # isi DATABASE_URL & AUTH_SECRET
npx prisma migrate dev --name init
npm run seed                # akun demo
npm run dev                 # http://localhost:3000
```

Skrip lain: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`, `npm run test`.

## Akun Demo

Semua password: `Demo1234!`

| Role   | Email                        | Keterangan                            |
| ------ | ---------------------------- | ------------------------------------- |
| ADMIN  | `admin@edulalin.id`          | Kelola sekolah, pengguna, modul, kuis |
| GURU   | `guru.a@sma1jakarta.sch.id`  | SMA 1 Jakarta                         |
| GURU   | `guru.b@smp2bandung.sch.id`  | SMP 2 Bandung                         |
| POLISI | `polisi@polri.go.id`         | Pantau lintas sekolah                 |
| MURID  | `dina@sma1jakarta.sch.id`    | SMA, 17+ (akses materi SIM)           |
| MURID  | `eko@sma1jakarta.sch.id`     | SMA, <17 (tanpa SIM)                  |
| MURID  | `fina@smp2bandung.sch.id`    | SMP                                    |

## Route Utama

- Public: `/`, `/tentang`, `/kontak`, `/login`, `/register`, `/lupa-password`
- `/dashboard` — arahkan sesuai role
- `/dashboard/admin/*` — kelola sekolah, users, modul, kuis, laporan, arsip, aktivitas
- `/dashboard/guru/*` — modul sekolah, murid, kuis, laporan
- `/dashboard/polisi/*` — sekolah, murid, modul, kuis, statistik
- `/dashboard/murid/*` — materi, progress, kuis, nilai, profil

Detail arsitektur dan keamanan: lihat [docs/index.md](index.md).