---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah halaman public, dashboard, komponen UI, styling, branding, atau responsivitas — berisi panduan UI/UX EDULALIN."
---

# Aturan UI/UX — EDULALIN

## Branding

- Nama utama: **EDULALIN** — Edukasi Lalu Lintas.
- Tagline: **"Belajar Aman di Jalan"**.
- Nuansa visual: biru utama, putih, biru muda; aksen keselamatan lalu lintas kuning/oranye secara terbatas.
- Ilustrasi ramah siswa: rambu, zebra cross, lampu lalu lintas, sepeda, kendaraan sekolah, helm, lingkungan kota Indonesia.
- Area "Kolaborasi/Dukungan" (Jasa Raharja, Sekolah, Kepolisian): gunakan placeholder/logo sah; JANGAN mengklaim kemitraan resmi tanpa data/izin.
- Semua teks UI dalam Bahasa Indonesia.
- Konsisten di desktop, tablet, dan mobile.

## Gaya Umum

- Whitespace, card, rounded corner, shadow halus, typography jelas, hierarki visual kuat.
- Hindari desain padat; jangan kebanyakan warna; jangan animasi berlebihan.
- Mobile-first; mikro-interaksi ringan; skeleton loading.
- Progress bar, badge status, ikon konsisten.
- Contrast warna & ukuran font aksesibel.

## Halaman Public

1. **Landing page:** header sticky (logo, Beranda, Tentang Kami, Program, Jenjang, FAQ, Kontak, Login, Daftar), hero modern dengan gradient overlay + ilustrasi lalu lintas, CTA "Mulai Belajar" & "Lihat Materi", statistik singkat, jenjang SD/SMP/SMA, modul SIM, fitur unggulan, cara kerja, kolaborasi, FAQ, footer.
2. **Tentang Kami:** visi, misi, program, peran edukasi keselamatan, kolaborasi.
3. **Kontak:** alamat, email, telepon, sosial media, form kontak.
4. **Login:** email, password, lupa password, link daftar.
5. **Register (khusus murid):** nama lengkap, tanggal lahir, sekolah, jenjang, kelas, email, telepon, password + konfirmasi, persetujuan syarat, verifikasi. Tanpa pilihan role.

## Dashboard

- Layout: sidebar + topbar + breadcrumb + main content + notification + profile menu, sidebar responsif.
- Sidebar per role sesuai `rbac.md` (Admin: Dashboard, Kelola Modul, Kelola Quiz, Kelola Pengguna, Pengguna Terhapus, Laporan & Statistik, Aktivitas Sistem, Sekolah, Pengaturan; Guru: Dashboard, Modul, Monitoring Murid, Quiz & Nilai, Laporan; Polisi: Dashboard Pemantauan, Daftar Sekolah, Jumlah Murid, Modul Murid, Kuis Murid, Ringkasan Statistik; Murid: Dashboard, Materi, Quiz, Progress, Nilai, Profil).

## Komponen & State

- Empty state, loading state, error state.
- Confirmation dialog untuk aksi destruktif (hapus, arsip, hapus permanen dengan konfirmasi berlapis).
- Toast & success feedback.
- Tabel responsif dengan pagination, filtering, search, sorting (menu admin).

## Aksesibilitas & UX

- Pastikan kontras warna dan ukuran font cukup.
- Judul/halaman jelas; hindari teks ambigu; gunakan Bahasa Indonesia konsisten.