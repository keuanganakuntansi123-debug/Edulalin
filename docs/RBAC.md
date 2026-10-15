# RBAC (Role-Based Access Control)

Empat peran: `ADMIN`, `GURU`, `POLISI`, `MURID`.

## Matriks Akses

| Kemampuan                            | ADMIN | GURU | POLISI | MURID |
| ------------------------------------ | :---: | :--: | :----: | :---: |
| Kelola sekolah                       |  ✅   |  —   |   —    |   —   |
| Buat akun guru/polisi                |  ✅   |  —   |   —    |   —   |
| Kelola semua modul/kuis              |  ✅   |  —   |   —    |   —   |
| Kelola modul/kuis sekolah sendiri    |  —    |  ✅  |   —    |   —   |
| Lihat murid sekolah sendiri          |  —    |  ✅  |   —    |   —   |
| Pantau lintas sekolah (read-only)    |  —    |  —   |   ✅   |   —   |
| Belajar materi (scope sekolah)       |  —    |  —   |   —    |   ✅   |
| Ikut kuis (max attempts)             |  —    |  —   |   —    |   ✅   |
| Lihat nilai & progres sendiri        |  —    |  —   |   —    |   ✅   |
| Laporan & statistik                  |  ✅   |  ✅* |   ✅   |   —   |

\* GURU: hanya data sekolah sendiri.

## Enforcement

1. **Edge (`src/proxy.ts`)** — memblokir `/dashboard` tanpa JWT; redirect
   salah role ke dashboard-nya (`dashboardPath`). Hanya memverifikasi JWT
   (tidak menyentuh DB → aman di edge).
2. **Server component** — setiap halaman dashboard menejalankan
   `await requireRole("ADMIN")` dll. sebelum query; redirect bila tidak cocok.
3. **Server action** — mutasi sensitif (buat user guru/polisi, arsip user,
   ubah status) memanggil `requireRole("ADMIN")` lagi di dalam action.
4. **Data scope** — `assertSameSchoolOrAdmin` dan `canAccessContent` menyaring
   data di server sehingga guru/murid hanya melihat sekolahnya.

## Pemetaan Route

| Prefix                    | Role yang diizinkan |
| ------------------------- | ------------------- |
| `/dashboard/admin/*`      | ADMIN               |
| `/dashboard/guru/*`       | GURU                |
| `/dashboard/polisi/*`     | POLISI              |
| `/dashboard/murid/*`      | MURID               |

## Aturan Khusus

- Registrasi publik hanya MURID; GURU & POLISI dibuat oleh ADMIN
  (`createGuruPolisi` memvalidasi role, wajib `schoolId` untuk guru).
- Akun ADMIN tidak bisa diarsipkan/diubah status (proteksi di action).
- Modul SIM hanya untuk murid berusia ≥ 17 — diverifikasi ulang di server
  (`canAccessSim(birthDate)`) bukan hanya UI.