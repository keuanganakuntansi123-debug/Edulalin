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