---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah CRUD kuis/soal, penilaian otomatis, attempt, atau tampilan hasil — berisi aturan kuis dan auto-grading EDULALIN."
---

# Aturan Kuis — EDULALIN

## Kelola Soal/Kuis (Admin)

- Tambah, edit, hapus/arsipkan kuis; hubungkan kuis dengan modul.
- Tentukan jenjang dan kelas.
- Pertanyaan pilihan ganda: opsi A/B/C/D, jawaban benar, bobot nilai, penjelasan jawaban.
- Nilai minimum kelulusan; batas attempt (jika diperlukan); acak soal/opsi (jika diaktifkan).
- Kuis dinilai otomatis setelah submit; simpan attempt dan jawaban murid.
- Tampilkan hasil dan pembahasan sesuai aturan kuis.

## Penilaian (Server-Side)

- Nilai dihitung ulang di server dari jawaban yang tersimpan; **jangan pernah percaya nilai yang dikirim frontend**.
- Gunakan transaction saat menyimpan attempt + jawaban (lihat `database.md`).
- Simpan attempt di `quiz_attempts`, jawaban di `quiz_answers` (relasi ke attempt & question).

## Scope Kuis

- Murid hanya melihat kuis yang sesuai: sekolah, jenjang, kelas, status aktif.
- Guru hanya melihat kuis di sekolahnya (read-only untuk monitoring).
- Polisi hanya melihat ringkasan kuis yang dikerjakan murid + status pengerjaan + ringkasan nilai (read-only).

## Tampilan Hasil untuk Murid

- Nilai setelah selesai sesuai setting.
- Status lulus/tidak lulus berdasarkan nilai minimum kelulusan.
- Pembahasan ditampilkan jika diaktifkan.

## Test yang Harus Ada (detail di `testing.md`)

- Kuis dihitung server-side (bukan dari client).
- Nilai tersimpan ke database.