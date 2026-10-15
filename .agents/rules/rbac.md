---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah kode yang menyentuh peran pengguna, proteksi route/API, atau menu dashboard — berisi matrix akses ADMIN, GURU, POLISI, dan MURID serta aturan otorisasi server-side."
---

# Aturan RBAC — EDULALIN

## Prinsip Dasar

- Setiap request yang mengakses data sensitif wajib lolos guard/authorization di **server** (route handler, server action, atau service layer).
- Otorisasi server adalah satu-satunya pengaman; menyembunyikan tombol di frontend BUKAN pengganti authorization.
- Endpoint yang tidak berhak mengembalikan `403` atau `404` sesuai policy **tanpa membocorkan keberadaan data**.
- Jangan pernah menentukan akses berdasarkan ID yang dikirim dari frontend (mis. `school_id` dari query param) — ambil scope dari session/akun yang sudah terautentikasi.

## Matrix Akses

| Kemampuan | ADMIN | GURU | POLISI | MURID |
|---|---|---|---|---|
| Akses global lintas sekolah | ✔ | — | ✔ lintas sekolah (baca saja) | — |
| Kelola modul, kuis, soal | ✔ | — | — | — |
| Kelola pengguna & role | ✔ | — | — | — |
| Monitoring murid sekolah sendiri | ✔ | ✔ (per sekolah/jenjang/kelas) | terbatas pada pemantauan | — |
| Mengerjakan materi & kuis | — | — | — | ✔ |
| Hapus/arsip/restore user | ✔ | — | — | — |
| Mengubah nilai/data progres | ✔ | — | — | — (hanya melihat punyanya sendiri) |

## ADMIN

- Akses global: semua sekolah, semua jenjang, semua pengguna.
- Kelola modul: tambah/edit/hapus/arsipkan, aktif/nonaktifkan, upload materi, atur scope sekolah/jenjang/kelas.
- Kelola kuis/soal: CRUD, hubungkan dengan modul, atur jenjang/kelas, nilai minimum, batas attempt, acak soal.
- Kelola pengguna: search/filter, verifikasi, ubah role sesuai kewenangan, ubah status, assign sekolah/jenjang/kelas, reset password (alur aman), arsipkan/soft delete.
- Kelola sekolah, laporan & statistik, aktivitas sistem, pengaturan.
- Pengguna Terhapus: daftar akun terarsip, restore, hapus permanen dengan konfirmasi berlapis.

## GURU

- Hanya melihat data di dalam sekolahnya sendiri; tidak boleh melihat sekolah lain.
- Dapat melihat modul, memonitor progress murid, melihat nilai quiz murid, dan melihat laporan kelas sesuai scope.
- TIDAK dapat mengedit/menghapus modul; TIDAK dapat membuat/mengubah soal; TIDAK dapat mengubah nilai atau data murid.
- Jika guru ditugaskan ke jenjang/kelas tertentu, akses dibatasi lagi hanya ke lingkup itu.
- Menu sidebar Guru: Dashboard, Modul, Monitoring Murid, Quiz & Nilai, Laporan.

## POLISI (read-only)

- Akun polisi HANYA dibuat oleh Admin — tidak ada registrasi publik untuk polisi.
- Akses baca-saja untuk pemantauan: daftar sekolah, jumlah murid per sekolah, ringkasan per jenjang/kelas, modul yang dibuka/diselesaikan murid, kuis yang dikerjakan beserta status dan ringkasan nilai.
- TIDAK dapat menambah/mengedit/menghapus/mengarsipkan sekolah, pengguna, modul, kuis, soal, hasil kuis, nilai, jawaban, progres, atau profil murid.
- TIDAK dapat membuat akun sendiri, mengubah role, atau hak akses.
- Semua akses polisi tercatat di activity log.
- Hanya tampilkan data yang diperlukan untuk pemantauan edukasi; hindari info pribadi murid yang tidak diperlukan.
- Menu sidebar Polisi: Dashboard Pemantauan, Daftar Sekolah, Jumlah Murid, Modul Murid, Kuis Murid, Ringkasan Statistik.

## MURID

- Hanya melihat konten sesuai: sekolah → jenjang → kelas → status aktif → aturan umur (SIM).
- Tidak boleh melihat data murid lain, guru, atau laporan.
- Dapat mengerjakan kuis; nilai dihitung ulang di server (jangan percaya nilai dari frontend).
- Menu sidebar Murid: Dashboard, Materi, Quiz, Progress, Nilai, Profil.

## Aturan Teknis

- Gunakan enum untuk `Role`: `ADMIN`, `GURU`, `POLISI`, `MURID`.
- Registrasi publik mewajibkan role `MURID` yang ditetapkan server; endpoint registrasi harus menolak request yang mencoba memaksa role lain (tanpa mengembalikan detail yang membocorkan policy).
- Proteksi tiap route dashboard: ADMIN (semua), GURU/POLISI/MURID sesuai menu masing-masing.
- Murid tidak boleh mengakses route admin (harus `403`/`404`), dan diuji (lihat `testing.md`).