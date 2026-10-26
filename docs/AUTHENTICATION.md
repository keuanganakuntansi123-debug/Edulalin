# Autentikasi

## Model Session

- JWT HS256 menggunakan `jose`, secret dari `AUTH_SECRET` (fallback dev).
- Cookie `edulalin_session` (HttpOnly, SameSite=Lax, Secure di production,
  maxAge 7 hari).
- Payload: `{ userId, role }` — hanya identitas minima; data user diambil
  dari DB setiap request (`getCurrentUser`).

## Alur Login

1. Form `/login` → server action `loginAction` → `login()` di
   `src/lib/auth.ts`.
2. Validasi Zod (`loginSchema`): email + password wajib.
3. `findUnique` by email; tolak user `deletedAt`/`INACTIVE`.
4. `verifyPassword` (bcryptjs).
5. Set cookie JWT + catat `LOGIN` (IP & user-agent).
6. Redirect ke `dashboardPath(role)`.

Pesan error generik "Email atau password salah" untuk mencegah
user enumeration.

## Registrasi Publik

- Khusus MURID: `register()` memaksa `role: "MURID"` di server —
  role tidak pernah diambil dari form.
- Validasi `registerSchema`: nama, email, tanggal lahir, sekolah, jenjang,
  kelas, password (min 8, huruf + angka, konfirmasi cocok).
- Setelah create: set cookie + catat `REGISTER`.

## Session Validasi per Request

- `proxy.ts` (edge): `getSessionPayload()` memverifikasi JWT tanpa DB.
- Halaman dashboard: `requireRole(roles)` → `getCurrentUser()` memuat user
  dari DB, menolak user terhapus/inaktif → `redirect("/login")` bila invalid.
- Admin/role-sensitive mutasi memanggil `requireRole("ADMIN")` / lainnya
  di dalam server action — bukan hanya UI.

## Password

- `hashPassword(password)` — bcryptjs dengan `SALT_ROUNDS = 12`.
- Tidak ada penyimpanan plaintext; tidak ada logging password.

## Keamanan

- Cookie HttpOnly → tidak diakses JavaScript.
- JWT diverifikasi setiap request; role diambil dari payload terverifikasi.
- Logout menghapus cookie dan mencatat `LOGOUT`.
- `AUTH_SECRET` wajib diubah di production (.env, bukan fallback dev).

## Lupa Password (OTP Email)

Alur tiga langkah di `/lupa-password`, seluruhnya dijalankan server-side
(`src/app/actions/password-reset-actions.ts`):

Berlaku untuk **semua aktor** (ADMIN, GURU, POLISI, MURID) — tidak ada
pembatasan peran, hanya status akun yang diperiksa.

1. **Kirim kode** — `requestOtp()` membuat kode OTP 6 digit
  (`crypto.getRandomValues`), menyimpannya sebagai hash bcrypt di
  `VerificationToken` (`type = "PASSWORD_RESET_OTP"`), lalu mengirimnya via
  `sendMail()` (`src/lib/mail.ts`).
2. **Verifikasi** — `verifyOtp()` mencocokkan kode dengan hash. Kode berlaku
  **5 menit**, sekali pakai, maksimal **5 percobaan** salah. Saat kode benar,
  masa berlaku diperbarui sehingga pengguna mendapat **5 menit penuh** untuk
  mengisi password baru.
3. **Simpan password baru** — `resetPassword()` menulis hash baru, mengaktifkan
  akun, membatalkan OTP yang masih aktif, dan **mencabut semua sesi lama**.

Pengaman tambahan:

- **Cooldown 60 detik** antar-permintaan kode (termasuk tombol "Kirim Ulang OTP").
- **Notifikasi kirim ulang** yang jelas (berhasil/gagal cooldown) tampil pada
  langkah verifikasi.
- Bila email gagal terkirim, OTP dihapus dan dicatat sebagai
  `PASSWORD_RESET_MAIL_FAILED` agar pengguna tidak terkunci cooldown.
- Email yang **belum terdaftar**, **nonaktif** (`INACTIVE`), atau sudah dihapus
  ditolak dengan pesan **"Email tidak terdaftar di EDULALIN."**. Akun berstatus
  `PENDING` tetap boleh mereset; akun otomatis diaktifkan (`ACTIVE`) setelah
  password baru tersimpan sehingga bisa langsung login.
- Password baru wajib min. 8 karakter (huruf + angka) dan **tidak boleh sama
  dengan nomor telepon** terdaftar.
- Audit: `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_OTP_VERIFIED`,
  `PASSWORD_RESET_COMPLETED`.

### Reset Manual oleh Admin

Jaring pengaman bila pengguna tidak dapat menerima email: admin membuka
**Kelola Pengguna → detail pengguna → Keamanan Akun → Atur Ulang Password**.
Admin menetapkan password sementara (min. 8 karakter, huruf + angka), sesi lama
dicabut, dan dicatat sebagai `USER_PASSWORD_RESET_BY_ADMIN`. Pengguna diminta
mengganti password tersebut dari menu Profil & Pengaturan.

### Konfigurasi SMTP (wajib agar kode terkirim)

Kode OTP dikirim lewat Gmail menggunakan **App Password**, bukan password akun.
Variabel environment yang dibutuhkan:

| Variabel | Contoh | Keterangan |
| --- | --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` | Server SMTP |
| `SMTP_PORT` | `465` | Opsional; jika kosong dicoba 465 → 587 → 25 |
| `SMTP_USER` | `akun@gmail.com` | Alamat Gmail pengirim |
| `SMTP_PASS` | `abcd efgh ijkl mnop` | **App Password 16 karakter** |
| `SMTP_FROM` | `EDULALIN` | Nama tampilan pengirim |
| `SMTP_SECURE` | `true` | Opsional; `true` untuk 465 |

Langkah pengisian:

1. Aktifkan **2-Step Verification** pada akun Google pengirim.
2. Buat App Password di <https://myaccount.google.com/apppasswords>.
3. Jalankan `npm run setup:smtp` (memvalidasi 16 karakter, menulis ke `.env`,
  dan menawarkan sinkronisasi ke Vercel), atau isi `SMTP_PASS` manual.
4. Verifikasi: `npm run test:smtp`.
5. Uji seluruh alur lupa password tanpa mengirim email nyata:
  `npm run test:forgot` (menguji keempat peran ADMIN/GURU/POLISI/MURID,
  cooldown, kirim ulang, OTP salah/sekali pakai, pencabutan sesi, dan login
  ulang dengan password baru).
6. Untuk produksi, set variabel yang sama pada Vercel
  (Settings → Environment Variables) lalu deploy ulang.

Status konfigurasi SMTP dapat dilihat langsung di
**Dashboard Admin → Pengaturan → Email OTP (Reset Password)**; halaman itu
menampilkan host, port, pengguna, dan panjang App Password (tanpa membocorkan
nilainya).