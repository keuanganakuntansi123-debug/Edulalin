---
trigger: model_decision
description: "Terapkan saat menulis atau menjalankan automated tests — berisi daftar test wajib EDULALIN (RBAC, isolasi, SIM, kuis, audit)."
---

# Aturan Testing — EDULALIN

## Test Wajib

1. Admin dapat melihat semua sekolah.
2. Guru SMA A tidak dapat membaca data SMA B.
3. Murid SMA A tidak dapat membaca data SMA B.
4. Murid SMA A tidak dapat mengakses URL modul milik SMA B.
5. Modul global terlihat sesuai jenjang/kelas.
6. Modul khusus SMA A hanya terlihat oleh SMA A.
7. Murid usia 16 tahun tidak dapat mengakses SIM.
8. Murid tepat usia 17 tahun dapat mengakses SIM.
9. Kuis dihitung server-side (nilai dari frontend tidak dipercaya).
10. Nilai tersimpan ke database.
11. Guru tidak dapat edit modul.
12. Murid tidak dapat mengakses admin route.
13. User yang di-soft-delete tidak dapat login.
14. Restore user mengaktifkan kembali sesuai policy.
15. Activity log tercatat untuk aksi penting.

## Cara Menulis

- Sertakan test untuk pemeriksaan otorisasi endpoint/route, bukan hanya komponen.
- Gunakan data seed yang mencakup sekolah berbeda (A/B) agar isolasi benar-benar teruji.
- Jalankan test setelah selesai implementasi; perbaiki semua error sebelum menyatakan selesai.
- Pastikan hasil test tercantum di output akhir (lihat `documentation.md`).