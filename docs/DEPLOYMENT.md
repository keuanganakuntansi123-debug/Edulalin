# Deployment

## Prasyarat

- Node.js ≥ 20 (dev pakai 22.14.0)
- PostgreSQL (≥ 14) aktif & dapat diakses
- Env: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`

```bash
cp .env.example .env
# DATABASE_URL=postgresql://USER:PASS@HOST:5432/edulalin
# AUTH_SECRET=<string acak panjang>  # jangan pakai fallback dev
```

## Build

```bash
npm ci
npx prisma migrate deploy        # apply migration ke production DB
npm run seed                     # opsional: data demo
npm run build
npm run start                    # production server
```

`npm run build` tidak memerlukan DB (halaman dashboard dinamis via
`instant = false`); namun migration/seed memerlukan DB aktif.

## Catatan Prisma 7

- Generator `prisma-client` (bukan `prisma-client-js`) menghasilkan klien
  di `src/generated/prisma`; impor via `@/generated/prisma/client`.
- Wajib `@prisma/adapter-pg` + `pg`; koneksi dibuat tunggal di
  `src/lib/prisma.ts` (PrismaPg).
- Setelah ubah skema: `npx prisma generate` (dan `npx prisma migrate dev`
  di lokal).

## Catatan Next 16

- `middleware.ts` diganti `src/proxy.ts` (ekspor `proxy` + `config.matcher`).
  Proxy hanya memakai JWT tanpa DB → kompatibel edge.
- Opsi `export const instant = false` (bukan `force-dynamic`) untuk route
  blocking yang memakai `cookies()`/DB.
- `cacheComponents` aktif; hindari `new Date()` saat prerender (footer
  memakai komponen statis).

## Environment

| Variabel               | Contoh                                        | Wajib |
| ---------------------- | --------------------------------------------- | :---: |
| `DATABASE_URL`         | `postgresql://user:pass@127.0.0.1:5432/edulalin` | ✅  |
| `AUTH_SECRET`          | 32+ karakter acak                             | ✅  |
| `NEXT_PUBLIC_APP_URL`  | `https://edulalin.example.com`                |  —   |
| `SMTP_HOST`            | `smtp.gmail.com`                              | ✅* |
| `SMTP_PORT`            | `465`                                         | ✅* |
| `SMTP_USER`            | `akun@gmail.com`                              | ✅* |
| `SMTP_PASS`            | App Password Gmail 16 karakter                | ✅* |
| `SMTP_FROM`            | `EDULALIN`                                    | ✅* |

\* Diperlukan agar fitur **Lupa Password** dapat mengirim kode OTP. Lihat
[AUTHENTICATION.md](AUTHENTICATION.md#konfigurasi-smtp-wajib-agar-kode-terkirim).
Isi di Vercel → **Settings → Environment Variables** (Production & Preview),
lalu deploy ulang. Lokal: `npm run setup:smtp` (menulis `.env` + menawarkan
sinkronisasi ke Vercel), verifikasi dengan `npm run test:smtp`, dan uji alur
lengkap tanpa email nyata dengan `npm run test:forgot`.

## Proxy / Security Checklist

- [ ] `AUTH_SECRET` kuat & tidak bocor di repo.
- [ ] Cookie session HttpOnly, Secure (production).
- [ ] Upload file (bila ditambahkan) divalidasi tipe & ukuran di server.
- [ ] Backup DB berkala; migration via `prisma migrate deploy`.
- [ ] Batasi akses admin; semua mutasi server-side memanggil `requireRole`.