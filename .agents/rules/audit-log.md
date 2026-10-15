---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah activity log, audit trail, soft delete, restore, atau menu Pengguna Terhapus — berisi aturan pencatatan dan arsip EDULALIN."
---

# Aturan Audit Log & Soft Delete — EDULALIN

## Activity Log / Audit Trail

- Semua perubahan penting TIDAK BOLEH terlewat: login/logout, register, verifikasi, tambah/edit/hapus modul, tambah/edit/hapus soal, submit kuis, restore user, archive user, perubahan role, perubahan school assignment, perubahan setting.
- Simpan di `activity_logs` (atau tabel audit setara): `actor`, `action`, `entity`, `entity_id`, `metadata`, `timestamp`, dan IP/user-agent bila kebijakan privasi mengizinkan.
- Semua akses POLISI juga wajib tercatat di activity log.
- Perubahan tanggal lahir dibarengi validasi ulang + audit (lihat `sim-module.md`).

## Soft Delete

- User & data penting di-soft-delete: isi `deleted_at`, jangan hapus fisik agar histori tetap tersimpan.
- User yang `deleted_at` terisi (atau status nonaktif) TIDAK boleh login.
- Gunakan transaction untuk proses perubahan user (delete, restore, ubah role).

## Pengguna Terhapus / Restore

- Berisi daftar akun terarsip: nama, email, role, sekolah, waktu dihapus/diarsipkan, admin yang melakukan tindakan, alasan (jika ada).
- Admin dapat restore atau hapus permanen (dengan konfirmasi berlapis).
- Restore mengaktifkan kembali sesuai policy (test wajib, lihat `testing.md`).
- History tetap tersimpan sesuai kebijakan audit.

## Praktik

- Jangan menampilkan data terhapus pada listing normal; gunakan query terpisah dengan filter `deleted_at IS NOT NULL` untuk menu khusus.
- Selalu tulis log dalam transaksi yang sama dengan aksi jika memungkinkan.