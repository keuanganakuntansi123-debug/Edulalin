# Privasi & Keamanan

## Data yang Disimpan

- Akun: nama, email, password (hash bcrypt), tanggal lahir, sekolah,
  jenjang/kelas, telepon, status, waktu verifikasi.
- Aktivitas belajar: progress modul, attempt kuis, jawaban, skor, log
  aktivitas (IP & user-agent saat login).
- Data **tidak pernah** dijual / dibagikan di luar platform & mitra resmi
  (sekolah, kepolisian, Jasa Raharja) sesuai perjanjian.

## Perlindungan

1. **Password** — bcryptjs salt 12; tidak disimpan plaintext; tidak
   di-log; tidak dikirim balik ke UI.
2. **Session** — cookie HttpOnly + Secure; JWT diverifikasi setiap request.
3. **Isolasi** — school-level isolation di server (lihat
   [SCHOOL_ISOLATION.md](SCHOOL_ISOLATION.md)); murid/guru hanya melihat
   data sekolahnya.
4. **Audit trail** — perubahan penting dicatat `ActivityLog` (siapa, apa,
   kapan, sekolah, IP/UA).
5. **Soft delete** — user/modul/kuis diarsipkan bukan dihapus permanen,
   histori tersimpan.
6. **Validasi input** — Zod di server untuk seluruh form; role tidak
   pernah diambil dari klien.
7. **Registrasi** — publik hanya MURID; akun GURU/POLISI dibuat admin.

## Hak Pengguna

- Murid melihat data pribadi & nilai di `/dashboard/murid/profil`.
- Guru/polisi hanya melihat data sesuai peran & sekolah (read-only untuk
  polisi).
- Penghapusan akun oleh admin = arsip (soft delete) + restore via
  `/dashboard/admin/archived`.

## Batasan Konten

Area "Kolaborasi/Dukungan" hanya placeholder logo/nama institusi; tidak
mengklaim kemitraan resmi tanpa persetujuan. Seluruh konten bersifat
edukatif.