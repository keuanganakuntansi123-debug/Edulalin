/**
 * Pemuat environment untuk skrip tsx mandiri.
 *
 * Next.js otomatis memuat `.env` + `.env.local`, tetapi skrip `tsx` tidak.
 * Modul ini diimpor PALING AWAL agar `process.env` sudah terisi sebelum modul
 * lain (mis. `@/lib/prisma` yang membaca `DATABASE_URL` saat inisialisasi)
 * dievaluasi. `.env` diisi lebih dulu, lalu `.env.local` melengkapi variabel
 * yang belum ada (mis. `BLOB_READ_WRITE_TOKEN`) tanpa menimpa nilai `.env`.
 */
import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.local", override: false, quiet: true });
