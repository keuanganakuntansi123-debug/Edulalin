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
- **Jurusan**: hanya berlaku untuk jenjang **SMA/SMK**. Untuk **SD/SMP** kolom
  jurusan disembunyikan di UI dan tidak wajib; nilai jurusan lama untuk SD/SMP
  diabaikan (`major = null`) agar tidak ada data jurusan yang tidak relevan.
- **Huruf kapital otomatis**: Nama Lengkap, Nama Sekolah, Kelas, Jurusan, dan
  Mata Pelajaran disimpan dengan HURUF KAPITAL di UI (`uppercase`) dan
  dinormalisasi di server (`normalizeIdentityName`). Email tetap format normal.
- **Standarisasi nama sekolah** (`validateSchoolName` di `src/lib/constants.ts`):
  - Negeri → `SDN`, `SMPN`, `SMAN`, `SMKN` (contoh: **SMKN 15 JAKARTA**).
  - Swasta → `SDS`, `SMPS`, `SMAS`, `SMKS` (contoh: **SMKS BUDI LUHUR**).
  - Prefiks menentukan jenjang & jenis sekolah sekaligus; bila tidak cocok
    dengan jenjang yang dipilih, pendaftaran ditolak dengan pesan panduan.
  - Penulisan panjang otomatis disetarakan (mis. `SMP NEGERI 1 JAKARTA` →
    `SMPN 1 JAKARTA`), sehingga variasi kapitalisasi/spasi **tidak membuat
    sekolah duplikat** — pencarian sekolah memakai `schoolId` yang sama dengan
    mode `insensitive`.
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

## Lupa Password (Pengajuan via Admin)

Reset password **tidak lagi memakai OTP email/SMTP**. Pengguna mengajukan
reset dari halaman publik `/lupa-password`, sistem memverifikasi kecocokan
identitas dengan akun asli di database, lalu Admin menyetel password baru.
Alur ini berlaku untuk **semua aktor** (ADMIN, GURU, POLISI, MURID).

Logika inti ada di `src/lib/password-reset-service.ts` (dapat diuji langsung
terhadap database), sedangkan server action di
`src/app/actions/password-reset-actions.ts` menambahkan otorisasi, audit, dan
revalidasi.

### Alur

1. **Pengajuan** — pengguna mengisi Email, Nama Lengkap, Sekolah, dan Kelas
  (kolom identitas menyesuaikan aktor: Murid → sekolah/jenjang/kelas/jurusan,
  Guru → sekolah/jenjang/mapel, Polisi → tingkat/nama kesatuan/divisi,
  Admin → nama+email). Kolom **Jurusan hanya muncul untuk murid SMA/SMK**;
  SD/SMP tidak memiliki jurusan. Seluruh identitas memakai **HURUF KAPITAL
  otomatis** (kecuali email), sama seperti registrasi. Bila tidak cocok,
  pengajuan **ditolak** dengan pesan
  **"Data identitas tidak sesuai dengan data akun terdaftar."** dan data
  pengguna tidak pernah diubah.
  - **Kecocokan** (`verifyResetIdentity`): nama & sekolah dicocokkan toleran
    (gelar/singkatan, mis. `SMAN 82 JAKARTA` = `SMA NEGERI 82 JAKARTA`);
    detail (jenjang, kelas, jurusan SMA/SMK, mata pelajaran, kesatuan)
    dicocokkan **persis**. Verifikasi lulus bila nama cocok, tidak ada detail
    yang bertentangan, dan skor ≥ 60.
2. **Sinkronisasi** — pengajuan yang identitasnya cocok tersimpan di tabel
  `PasswordResetRequest` (`status = PENDING`, `verified`, `matchScore`,
  `matchedFields`, `mismatchFields`). Notifikasi otomatis dikirim ke semua
  Admin aktif melalui **lonceng in-app** (riwayat: `/dashboard/notifikasi`) berisi nama,
  email, peran, tanggal & jam WIB, detail identitas, dan ID pengajuan. Tidak ada
  email yang dikirim — seluruh notifikasi disalurkan lewat lonceng.
3. **Kelola oleh Admin** — menu **Kelola Lupa Password** menampilkan daftar
  pengajuan (nama, email, identitas, tanggal, status, skor kecocokan).
4. **Reset** — Admin mengisi **Password Baru** + **Konfirmasi Password Baru**
  lalu **Simpan Password**. `completePasswordReset()` hanya berjalan bila
  pengajuan `PENDING` **dan** identitas terverifikasi; password akun asli
  diperbarui di Neon, semua sesi lama dicabut, dan pengajuan ditandai
  `COMPLETED` sehingga hilang dari daftar aktif.
5. **Notifikasi hasil** — pengguna menerima **notifikasi lonceng** berisi nama,
  tanggal, jam (WIB), serta info bahwa password berhasil diperbarui. Password
  baru **tidak pernah** dikirim melalui notifikasi.
6. **Login kembali** — pengguna masuk memakai email + password baru tanpa
  membuat akun baru atau kehilangan data.

### Notifikasi Modul Baru

Saat Admin menambahkan atau membagikan modul baru berstatus aktif, sistem
mengirim notifikasi lonceng ke **Murid & Guru** pada sekolah tujuan (atau semua
sekolah sesuai jenjang bila modul global) dan ke **semua Polisi** aktif sesuai
hak akses pemantauan. Isi notifikasi: judul modul, kategori, tanggal & jam WIB,
dan tautan untuk membuka modul. Modul SIM hanya untuk murid SMA/SMK berusia
≥17 tahun.

### Pusat Notifikasi

Seluruh aktor (ADMIN, GURU, POLISI, MURID) memakai satu lonceng terpadu
(`NotificationCenter`) pada topbar, dengan jumlah belum dibaca, status
sudah/belum dibaca, tandai-baca, hapus, dan tautan langsung ke halaman terkait.
Data diambil dari `GET /api/notifications` sehingga tersinkronisasi real-time
antar peran. Guru, Polisi, dan Murid **tidak** memiliki menu notifikasi
tersendiri di sidebar — semua pemberitahuan hanya muncul pada lonceng. Halaman
riwayat `/dashboard/notifikasi` (filter semua/belum dibaca/sudah dibaca)
khusus **Admin**.

### Notifikasi Lonceng (tanpa email)

EDULALIN **tidak** memakai email/SMTP untuk notifikasi. Seluruh pemberitahuan
(pengajuan lupa password ke Admin, perubahan password ke pengguna, modul baru,
hasil kuis) dikirim melalui **lonceng in-app** dan tersimpan di tabel
`Notification`, sehingga real-time dan tersinkronisasi antar peran tanpa
kredensial email tambahan.

### Pengaman

- Admin **tidak dapat** reset tanpa pengajuan valid: `completePasswordReset()`
  menolak pengajuan yang tidak terverifikasi / sudah diproses / akun diarsipkan.
- Bila proses reset gagal, pengajuan **tetap `PENDING`** (tidak hilang) dan
  pesan gagal ditampilkan.
- Password disimpan sebagai hash bcrypt (12 rounds); password lama never
  ditampilkan.
- Password baru: min. 8 karakter (huruf + angka), boleh dikonfirmasi, dan tidak
  boleh sama dengan nomor telepon terdaftar.
- Pengajuan ulang identik dalam 5 menit dianggap duplikat (dikembalikan, bukan
  baris baru) dan dibatasi maksimal 5 pengajuan/jam per akun.
- Email tak terdaftar / `INACTIVE` / dihapus ditolak dengan pesan
  **"Email tidak terdaftar di EDULALIN."** Akun `PENDING` diaktifkan otomatis
  setelah password baru tersimpan.
- Audit: `PASSWORD_RESET_REQUEST_SUBMITTED`,
  `PASSWORD_RESET_COMPLETED_BY_ADMIN`, `PASSWORD_RESET_REQUEST_REJECTED`,
  `PASSWORD_RESET_REQUEST_DELETED`.

### Ubah Password Mandiri

Semua aktor dapat mengganti password kapan saja setelah login melalui
**Profil & Pengaturan → Ubah Password**: password lama (verifikasi) + password
baru + konfirmasi baru (`changeOwnPassword()`). Dicatat sebagai
`PASSWORD_CHANGED_BY_USER`.

### Pengujian

`npm run test:reset` menguji seluruh rantai terhadap Neon: pengajuan identitas
benar/salah, anti-duplikat, penolakan reset tanpa identitas valid, verifikasi
password lemah/konfirmasi beda, reset oleh Admin, efek tersinkron di DB
(password baru valid & lama gugur, pengajuan `COMPLETED`), reset ulang ditolak,
ubah password mandiri, dan penolakan pengajuan.