MASTER PROMPT — PEMBANGUNAN WEBSITE EDULALIN
================================================

Nama platform:
EDULALIN — Edukasi Lalu Lintas
Tagline:
"Belajar Aman di Jalan"

TUJUAN
------
Bangun sebuah platform edukasi keselamatan lalu lintas berbasis web bernama EDULALIN. Platform ini menjadi media pembelajaran yang mempertemukan kebutuhan edukasi keselamatan dari Jasa Raharja, sekolah, dan unsur kepolisian dalam bentuk materi digital, kuis interaktif, pemantauan pembelajaran, serta laporan statistik.

Gunakan screenshot/referensi yang diberikan pengguna sebagai referensi struktur dan alur, tetapi JANGAN menyalin mentah desainnya. Tingkatkan UI/UX agar lebih modern, profesional, ramah siswa, responsif, dan terasa seperti platform edutech resmi.

CATATAN BRANDING
----------------
- Gunakan identitas "EDULALIN" sebagai nama utama.
- Gunakan tagline "Belajar Aman di Jalan".
- Nuansa visual: biru sebagai warna utama, putih, biru muda, aksen keselamatan lalu lintas seperti kuning/oranye secara terbatas.
- Gunakan ilustrasi edukasi lalu lintas yang ramah siswa: rambu, zebra cross, lampu lalu lintas, sepeda, kendaraan sekolah, helm, dan lingkungan kota Indonesia.
- Sediakan area "Kolaborasi/Dukungan" untuk Jasa Raharja, Sekolah, dan Kepolisian menggunakan placeholder/logo yang sah. Jangan mengklaim kemitraan resmi jika belum ada data/izin.
- UI harus konsisten pada desktop, tablet, dan mobile.
- Hindari desain terlalu padat. Gunakan whitespace, card, rounded corner, shadow halus, typography jelas, dan hierarki visual yang kuat.
- Semua teks UI menggunakan Bahasa Indonesia.

STACK YANG DIREKOMENDASIKAN
---------------------------
- Next.js + TypeScript
- Tailwind CSS
- shadcn/ui atau komponen UI setara
- PostgreSQL
- Prisma ORM
- Auth.js/NextAuth atau sistem authentication aman yang setara
- Zod untuk validasi
- React Hook Form untuk form
- Recharts untuk statistik
- Upload storage yang aman untuk PDF/video/dokumen
- Gunakan server-side authorization, bukan hanya menyembunyikan tombol di frontend.

PRINSIP UTAMA
-------------
1. RBAC wajib: ADMIN, GURU, POLISI, MURID.
2. School-level isolation wajib.
3. Education-level isolation wajib.
4. Semua query data pengguna, modul, kuis, progress, dan laporan wajib menerapkan authorization dan scope sekolah.
5. Admin memiliki akses global.
6. Guru hanya dapat melihat data yang menjadi scope sekolah/jenjangnya.
7. Polisi memiliki akses pemantauan lintas sekolah sesuai kewenangan yang diberikan, terbatas pada daftar sekolah, jumlah murid per sekolah, serta modul/kuis yang dikerjakan murid dan ringkasan hasilnya. Polisi tidak dapat mengubah data, modul, kuis, akun, atau nilai.
8. Murid hanya dapat melihat konten sesuai sekolah dan jenjang/kelasnya.
9. Jangan mengandalkan ID yang dikirim dari frontend untuk menentukan akses.
10. Semua akses sensitif harus diverifikasi di server.
11. Semua perubahan penting masuk activity log/audit trail.
12. Soft delete untuk user dan data penting; histori tetap tersimpan.
13. Password wajib di-hash dengan algoritma modern seperti Argon2id atau bcrypt dengan konfigurasi aman.
14. Jangan simpan password plaintext.
15. Terapkan rate limiting pada login, registrasi, dan endpoint sensitif.
16. Validasi semua input.
17. Lindungi upload file dan batasi tipe/ukuran file.
18. Gunakan pagination, filtering, search, sorting pada tabel admin.
19. Sediakan empty state, loading state, error state, confirmation dialog, toast, dan success feedback.

AKTOR & HAK AKSES
=================

A. ADMIN
--------
Admin adalah pengelola platform secara global.

Dashboard Admin:
- Total pengguna
- Total murid
- Total guru
- Total sekolah
- Total modul aktif
- Total kuis
- Total attempt kuis
- Pengguna aktif
- Grafik pengguna aktif
- Grafik aktivitas belajar
- Grafik penyelesaian modul
- Grafik hasil kuis
- Aktivitas sistem terbaru
- Modul terpopuler
- Sekolah terdaftar

Kelola Modul:
- Tambah modul
- Edit modul
- Hapus/arsipkan modul
- Aktif/nonaktifkan modul
- Upload PDF/PPT/video/link
- Judul
- Deskripsi
- Thumbnail
- Jenjang: SD/SMP/SMA/SIM
- Kelas
- Target sekolah atau global
- Urutan modul
- Durasi
- Status
- Preview
- Tracking jumlah dibaca
- Tracking progress
- Pastikan perubahan modul tersinkronisasi dengan tampilan murid sesuai scope.

Kelola Soal/Kuis:
- Tambah kuis
- Edit kuis
- Hapus/arsipkan kuis
- Hubungkan kuis dengan modul
- Tentukan jenjang dan kelas
- Pertanyaan pilihan ganda
- Opsi A/B/C/D
- Jawaban benar
- Bobot nilai
- Penjelasan jawaban
- Nilai minimum kelulusan
- Batas attempt jika diperlukan
- Acak soal/opsi jika diaktifkan
- Kuis otomatis dinilai setelah submit
- Simpan attempt dan jawaban murid
- Tampilkan hasil dan pembahasan sesuai aturan.

Kelola Pengguna:
- Daftar pengguna
- Search
- Filter role
- Filter sekolah
- Filter jenjang
- Filter kelas
- Verifikasi pengguna
- Ubah role sesuai kewenangan
- Ubah status aktif/nonaktif
- Assign sekolah
- Assign jenjang/kelas
- Lihat detail pengguna
- Reset password melalui alur aman
- Arsipkan pengguna
- Soft delete
- Riwayat aktivitas pengguna

Pengguna Terhapus:
- Daftar akun terarsip
- Nama
- Email
- Role
- Sekolah
- Waktu dihapus/diarsipkan
- Admin yang melakukan tindakan
- Alasan jika tersedia
- Tombol restore
- Tombol hapus permanen dengan confirmation berlapis
- History tetap tersimpan sesuai kebijakan audit.

Laporan & Statistik:
- Laporan pengguna
- Laporan sekolah terdaftar
- Laporan modul
- Laporan modul dibaca
- Laporan progress murid
- Laporan quiz
- Jumlah attempt
- Nilai rata-rata
- Nilai tertinggi/terendah
- Persentase kelulusan
- Aktivitas per sekolah
- Aktivitas per jenjang
- Export Excel
- Export PDF
- Filter tanggal/sekolah/jenjang/kelas.

Aktivitas Sistem:
- Login/logout
- Register
- Verifikasi
- Tambah/edit/hapus modul
- Tambah/edit/hapus soal
- Submit kuis
- Restore user
- Archive user
- Perubahan role
- Perubahan school assignment
- Perubahan setting
- Simpan actor, action, entity, entity_id, metadata, timestamp, IP/user agent jika kebijakan privasi mengizinkan.

B. GURU
--------
Guru adalah pengguna monitoring dengan akses terbatas.

Dashboard Guru:
- Total murid di sekolahnya
- Modul tersedia
- Progress pembelajaran
- Statistik quiz
- Aktivitas belajar
- Ringkasan per kelas
- Ringkasan per jenjang

Guru:
- Hanya dapat melihat data dalam sekolahnya.
- Tidak dapat melihat sekolah lain.
- Tidak dapat mengedit/hapus modul.
- Tidak dapat membuat/mengubah soal.
- Dapat melihat modul.
- Dapat memonitor progress murid.
- Dapat melihat nilai quiz murid sesuai scope sekolah.
- Dapat melihat laporan kelas yang menjadi scope-nya.
- Jika guru ditugaskan ke kelas tertentu, batasi lagi hanya ke kelas tersebut.

D. POLISI
---------
Polisi adalah aktor pemantauan edukasi keselamatan lalu lintas dengan akses baca saja.
Akun polisi hanya dibuat oleh Admin; tidak tersedia registrasi publik untuk polisi.

Dashboard Polisi:
- Total sekolah yang terpantau
- Daftar sekolah yang terdaftar di EDULALIN
- Jumlah murid pada setiap sekolah
- Ringkasan aktivitas pembelajaran murid
- Ringkasan modul dan kuis yang dikerjakan murid
- Statistik penyelesaian modul dan hasil kuis dalam bentuk ringkasan
- Filter berdasarkan sekolah, jenjang, kelas, modul, kuis, dan rentang tanggal jika tersedia

Akses Pemantauan Polisi:
- Melihat daftar sekolah yang menggunakan EDULALIN.
- Melihat jumlah murid pada masing-masing sekolah.
- Membuka ringkasan sekolah untuk melihat jumlah murid per jenjang/kelas jika data tersedia.
- Melihat modul yang telah dibuka/diselesaikan oleh murid.
- Melihat kuis yang dikerjakan murid beserta status pengerjaan dan ringkasan nilai sesuai kebijakan akses.
- Melakukan pencarian dan filter pada data pemantauan.
- Tidak dapat menambah, mengedit, menghapus, atau mengarsipkan sekolah, pengguna, modul, kuis, soal, maupun hasil kuis.
- Tidak dapat mengubah nilai, jawaban, progres, atau data profil murid.
- Tidak dapat membuat akun sendiri dan tidak dapat mengubah role atau hak akses.
- Semua akses polisi harus tercatat dalam activity log/audit trail.
- Tampilkan hanya data yang diperlukan untuk tujuan pemantauan edukasi; hindari menampilkan informasi pribadi murid yang tidak diperlukan.
- Akses data lintas sekolah hanya berlaku untuk role POLISI dan harus dibatasi pada menu pemantauan di atas. Jangan memberikan akses global admin.

C. MURID
---------
Murid adalah pengguna pembelajaran.

Dashboard Murid:
- Sapaan personal
- Sekolah
- Jenjang
- Kelas
- Progress belajar
- Modul tersedia
- Modul selesai
- Quiz tersedia
- Quiz selesai
- Nilai terakhir
- Rekomendasi materi
- Kartu "SIM" jika sudah memenuhi syarat umur
- Achievement/progress sederhana.

Materi:
- Hanya melihat modul yang sesuai:
  1. sekolah
  2. jenjang
  3. kelas
  4. status aktif
  5. aturan akses umur jika berlaku.
- Dapat membuka PDF/PPT/video/link.
- Simpan progress membaca/menonton.
- Tampilkan persentase progress.

Quiz:
- Hanya quiz yang sesuai scope murid.
- Submit jawaban.
- Hitung nilai otomatis di server.
- Simpan attempt.
- Tampilkan nilai setelah selesai sesuai setting quiz.
- Tampilkan status lulus/tidak lulus.
- Tampilkan pembahasan jika diaktifkan.
- Jangan percaya nilai yang dikirim dari frontend; server menghitung ulang.

ATURAN MODUL SIM
================
Buat modul khusus "SIM".

Saat registrasi murid:
- Wajib tanggal lahir.
- Hitung umur berdasarkan tanggal hari ini, bukan hanya tahun lahir.
- Modul SIM hanya terbuka jika umur >= 17 tahun.
- Jika umur < 17, modul SIM tidak ditampilkan atau tidak dapat dibuka.
- Backend wajib memvalidasi aturan ini setiap kali modul SIM diakses.
- Frontend hanya sebagai UX; authorization sebenarnya tetap di backend.
- Jika pengguna tepat berulang tahun ke-17, akses otomatis tersedia tanpa admin mengubah manual.
- Jika tanggal lahir diubah, lakukan validasi/audit.
- SIM dapat memiliki materi dan quiz sendiri.
- Admin dapat membuat/mengelola modul SIM.
- Tampilkan status yang jelas:
  "Belum tersedia — Modul SIM terbuka saat usia Anda mencapai 17 tahun."
- Jangan tampilkan materi SIM kepada pengguna yang belum memenuhi syarat.

ISOLASI SEKOLAH / MULTI-TENANT
==============================
Ini adalah fitur paling penting.

Contoh:
- SMA A
- SMA B
- SMA C

Jika murid berasal dari SMA A:
- hanya melihat SMA A.
- tidak boleh melihat murid SMA B.
- tidak boleh melihat guru SMA B.
- tidak boleh melihat modul khusus SMA B.
- tidak boleh melihat quiz khusus SMA B.
- tidak boleh melihat laporan SMA B.

Jika guru berasal dari SMA A:
- hanya monitoring SMA A.
- tidak boleh membuka data SMA B meskipun mencoba mengubah URL/ID.

Admin:
- dapat melihat semua sekolah.

Implementasikan school_id pada seluruh entity yang membutuhkan scope sekolah.
Gunakan authorization policy/server guard:
- ADMIN = global
- GURU = school-scoped sesuai sekolah/jenjang/kelas penugasan
- POLISI = lintas sekolah hanya untuk endpoint/menu pemantauan yang diizinkan (daftar sekolah, jumlah murid, modul/kuis yang dikerjakan, dan ringkasan statistik); read-only
- MURID = school-scoped
- Jika konten bersifat global, school_id dapat NULL dan dapat tampil ke sekolah yang memenuhi jenjang/kelas.
- Jika konten school-specific, wajib matching school_id.

Jangan hanya melakukan filtering di frontend.

STRUKTUR SEKOLAH
=================
School:
- id
- code
- name
- education_level
- address
- city
- province
- status
- created_at
- updated_at

User:
- id
- name
- email
- password_hash
- role
- birth_date
- school_id
- education_level
- class_level
- phone
- verified_at
- status
- created_at
- updated_at
- deleted_at

Buat unique constraint yang sesuai untuk email.
Buat index pada school_id, role, education_level, class_level, status.

DESAIN HALAMAN PUBLIC
=====================
1. Landing page
- Header sticky
- Logo EDULALIN
- Beranda
- Tentang Kami
- Program
- Jenjang
- FAQ
- Kontak
- Login
- Daftar
- Hero section dengan ilustrasi keselamatan lalu lintas
- CTA "Mulai Belajar"
- CTA "Lihat Materi"
- Statistik singkat
- Jenjang SD/SMP/SMA
- Modul SIM
- Fitur unggulan
- Cara kerja
- Kolaborasi Jasa Raharja / Sekolah / Kepolisian
- FAQ
- Footer.

2. Tentang Kami
- Visi
- Misi
- Tentang program
- Peran edukasi keselamatan
- Kolaborasi.

3. Kontak
- Alamat
- Email
- Telepon
- Sosial media
- Form kontak.

4. Login
- Email
- Password
- Lupa password
- Login
- Link daftar.

5. Register (khusus MURID)
- Hanya murid yang boleh membuat akun melalui registrasi publik.
- Nama lengkap
- Tanggal lahir
- Sekolah
- Jenjang
- Kelas
- Email
- Nomor telepon
- Password
- Konfirmasi password
- Persetujuan syarat dan kebijakan privasi
- Verifikasi akun.
- Role otomatis ditetapkan sebagai MURID oleh server; jangan tampilkan pilihan role.
- Jangan izinkan pengguna memilih role ADMIN, GURU, atau POLISI melalui form publik.

Pembuatan Akun Guru dan Polisi:
- Akun GURU dan POLISI hanya dibuat oleh ADMIN melalui menu Kelola Pengguna.
- Admin menetapkan role, sekolah/lingkup penugasan, status akun, dan data yang diperlukan.
- Untuk akun GURU, Admin wajib menetapkan sekolah dan bila diperlukan jenjang/kelas yang menjadi tanggung jawabnya.
- Untuk akun POLISI, Admin menetapkan status aktif serta lingkup pemantauan sesuai kewenangan; secara default dapat memantau daftar sekolah, jumlah murid, dan aktivitas modul/kuis lintas sekolah, tanpa hak mengubah data.
- Guru dan polisi login menggunakan akun yang diberikan/dibuat Admin; tidak ada halaman registrasi publik bagi keduanya.
- Lindungi endpoint registrasi di backend agar role selain MURID tidak dapat dibuat melalui request manipulasi.

DASHBOARD UI
============
Gunakan layout:
- Sidebar
- Topbar
- Breadcrumb
- Main content
- Notification
- Profile menu
- Responsive sidebar.

Admin sidebar:
Dashboard
Kelola Modul
Kelola Quiz
Kelola Pengguna
Pengguna Terhapus
Laporan & Statistik
Aktivitas Sistem
Sekolah
Pengaturan

Guru sidebar:
Dashboard
Modul
Monitoring Murid
Quiz & Nilai
Laporan

Polisi sidebar:
Dashboard Pemantauan
Daftar Sekolah
Jumlah Murid
Modul Murid
Kuis Murid
Ringkasan Statistik

Murid sidebar:
Dashboard
Materi
Quiz
Progress
Nilai
Profil

UI/UX YANG HARUS DITINGKATKAN
=============================
Dibandingkan referensi:
- Buat hero lebih modern dengan gradient overlay dan visual edukasi.
- Gunakan card yang lebih elegan.
- Tambahkan progress bar.
- Tambahkan badge status.
- Tambahkan icon yang konsisten.
- Gunakan micro-interaction ringan.
- Gunakan skeleton loading.
- Gunakan toast notification.
- Gunakan modal konfirmasi.
- Gunakan responsive table.
- Gunakan chart yang mudah dipahami.
- Gunakan empty states yang informatif.
- Pastikan kontras warna dan ukuran font aksesibel.
- Mobile-first.
- Hindari terlalu banyak warna.
- Jangan menggunakan animasi berlebihan.

DATABASE
========
Gunakan PostgreSQL + Prisma.
Buat migration.
Gunakan foreign key.
Gunakan index.
Gunakan enum untuk Role, EducationLevel, Status.
Gunakan transaction untuk proses penting seperti submit quiz dan perubahan user.
Gunakan soft delete untuk user.
Buat audit/activity log.

ENTITAS MINIMAL
===============
users
schools
modules
module_progress
quizzes
quiz_questions
quiz_attempts
quiz_answers
activity_logs
user_sessions
password_reset_tokens
verification_tokens
deleted_user_history / atau gunakan users.deleted_at + audit_logs
school_memberships jika user dapat memiliki lebih dari satu assignment di masa depan.

RELASI
======
School 1..N Users
School 1..N Modules
User 1..N ModuleProgress
Module 1..N ModuleProgress
Module 1..N Quizzes
Quiz 1..N QuizQuestions
Quiz 1..N QuizAttempts
QuizAttempt 1..N QuizAnswers
QuizQuestion 1..N QuizAnswers
User 1..N QuizAttempts
User 1..N ActivityLogs
School 1..N ActivityLogs

KEAMANAN
========
- RBAC server-side
- School isolation server-side
- CSRF protection sesuai arsitektur
- Secure cookie
- HttpOnly
- SameSite
- Password hashing
- Rate limiting
- Input validation
- SQL injection protection melalui ORM/parameterized query
- XSS protection
- File upload validation
- MIME/type validation
- Max file size
- Audit log
- Secure error messages
- Jangan membocorkan apakah email tertentu terdaftar pada endpoint sensitif.
- Jangan menampilkan data sekolah lain melalui API.
- API harus mengembalikan 403/404 sesuai policy tanpa membocorkan data.

TESTING WAJIB
=============
Buat test untuk:
1. Admin dapat melihat semua sekolah.
2. Guru SMA A tidak dapat membaca data SMA B.
3. Murid SMA A tidak dapat membaca data SMA B.
4. Murid SMA A tidak dapat mengakses URL modul milik SMA B.
5. Modul global dapat terlihat sesuai jenjang/kelas.
6. Modul khusus SMA A hanya terlihat oleh SMA A.
7. Murid usia 16 tahun tidak dapat mengakses SIM.
8. Murid tepat usia 17 tahun dapat mengakses SIM.
9. Quiz dihitung server-side.
10. Nilai tersimpan ke database.
11. Guru tidak dapat edit modul.
12. Murid tidak dapat mengakses admin route.
13. User yang di-soft-delete tidak dapat login.
14. Restore user mengaktifkan kembali sesuai policy.
15. Activity log tercatat untuk aksi penting.

SEED DATA
=========
Buat seed:
- 1 admin
- 2 sekolah berbeda
- 1 guru per sekolah (akun dibuat admin, bukan registrasi publik)
- 1 akun polisi demo (dibuat admin, akses pemantauan read-only)
- beberapa murid dengan kelas berbeda
- modul SD/SMP/SMA
- modul SIM
- beberapa quiz dan soal
- sample attempts
- activity logs.

Buat akun demo yang jelas ditandai sebagai DEMO dan jangan gunakan password production.

DOKUMENTASI YANG HARUS DIBUAT
==============================
Buat folder docs:
- README.md
- ARCHITECTURE.md
- DATABASE.md
- RBAC.md
- SCHOOL_ISOLATION.md
- AUTHENTICATION.md
- MODULES.md
- QUIZ.md
- REPORTING.md
- API.md
- DEPLOYMENT.md
- TESTING.md
- PRIVACY.md

README harus menjelaskan:
- instalasi
- environment variables
- database setup
- migration
- seed
- menjalankan development
- build production
- deployment.

DATABASE.md:
- ERD dalam Mermaid
- tabel
- field
- relationship
- index
- constraint.

RBAC.md:
- matrix akses ADMIN/GURU/POLISI/MURID.

SCHOOL_ISOLATION.md:
- aturan tenant/school scope
- contoh SMA A vs SMA B
- contoh authorization policy.

HASIL AKHIR YANG DIHARAPKAN
===========================
Jangan hanya membuat tampilan mockup.
Bangun aplikasi full-stack yang benar-benar berfungsi.

Deliver:
1. Frontend public
2. Authentication
3. Registration
4. Dashboard ADMIN
5. Dashboard GURU
6. Dashboard MURID
7. CRUD modul
8. CRUD quiz
9. Auto grading
10. Progress tracking
11. School isolation
12. Age-based SIM access
13. User management
14. Soft delete + restore
15. Audit log
16. Reports/statistics
17. Export Excel/PDF
18. Responsive UI
19. Database migration
20. Seed
21. Automated tests
22. Dokumentasi lengkap.

ATURAN IMPLEMENTASI UNTUK CLAUDE CODE
======================================
Sebelum coding:
1. Audit project yang sudah ada.
2. Buat plan implementasi.
3. Identifikasi file/folder yang perlu dibuat/diubah.
4. Jangan menghapus fitur yang sudah bekerja tanpa alasan.
5. Gunakan reusable components.
6. Pisahkan business logic dari UI.
7. Gunakan service/repository/policy layer bila sesuai.
8. Setelah implementasi jalankan lint, typecheck, test, dan build.
9. Perbaiki semua error.
10. Pastikan tidak ada dummy data yang mengganggu production.
11. Pastikan semua route terlindungi.
12. Pastikan database migration dapat dijalankan dari fresh database.
13. Pastikan seed berhasil.
14. Dokumentasikan keputusan arsitektur.

OUTPUT CLAUDE CODE
==================
Setelah selesai, tampilkan:
- struktur project
- stack yang digunakan
- cara menjalankan
- env variables yang dibutuhkan
- migration command
- seed command
- akun demo
- route utama
- ringkasan fitur
- hasil test
- hasil build
- catatan keamanan
- catatan deployment.

Prioritas:
P0 = authentication, RBAC, school isolation, database, module, quiz, SIM age rule.
P1 = dashboard, progress, reports, audit log, soft delete.
P2 = enhancement UI, animation, achievement, recommendation.

Jangan menyatakan fitur "sudah selesai" sebelum benar-benar diimplementasikan dan diuji.
