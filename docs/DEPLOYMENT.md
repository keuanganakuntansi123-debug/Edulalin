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
| `STORAGE_DIR`          | `/tmp/storage` (Vercel)                       |  —   |
| `BLOB_READ_WRITE_TOKEN`| token Vercel Blob (wajib di produksi)         |  ⚠️  |

### Penyimpanan File (Vercel Blob)

Vercel Function punya batas body request ±4,5 MB. Agar Admin dapat mengunggah
berkas **hingga 50 MB** (PDF, Word, video, gambar) di Vercel, unggahan dialirkan
**browser → Vercel Blob langsung** (client upload) dan hanya metadata-nya yang
masuk ke Neon. `BLOB_READ_WRITE_TOKEN` wajib ada agar jalur ini aktif; tanpa
token, unggahan besar akan gagal dengan 413.

Sambungkan Blob store ke proyek sekali saja:

```powershell
npx vercel storage connect edulalin-files --project edulalin --auth token --add-rw-token --yes --environment production --environment preview --environment development
```

Untuk pengembangan lokal, tarik token ke `.env.local`:

```powershell
npx vercel env pull .env.local --environment development --project edulalin
```

Uji tulis/baca/hapus Blob dengan `npx tsx scripts/test-storage.mts`.

Seluruh notifikasi (lupa password, modul baru, hasil kuis) memakai **lonceng
in-app** — tidak ada email/SMTP. Lihat
[AUTHENTICATION.md](AUTHENTICATION.md#notifikasi-lonceng-tanpa-email).

## Proxy / Security Checklist

- [ ] `AUTH_SECRET` kuat & tidak bocor di repo.
- [ ] Cookie session HttpOnly, Secure (production).
- [ ] Upload file (bila ditambahkan) divalidasi tipe & ukuran di server.
- [ ] Backup DB berkala; migration via `prisma migrate deploy`.
- [ ] Batasi akses admin; semua mutasi server-side memanggil `requireRole`.