# Kuis & Penilaian

## Model

- `Quiz`: judul, deskripsi, moduleId?, jenjang (SD|SMP|SMA|SMK|SIM), kelas?, sekolah?,
  `minScore` (default 60), `maxAttempts?`, `shuffle`, `showResult`,
  `showDiscussion`, status, soft delete.

SIM adalah subtype dalam kategori SMA/SMK (bukan kategori sendiri):
dipilih via toggle pada form, hanya dapat ditargetkan ke sekolah
SMA/SMK, dan murid < 17 tahun diblokir memulai kuis SIM (`canAccessSim`).
- `Question`: quizId, teks, opsi A–D, `correctOption` (A|B|C|D), `weight`,
  `explanation`, `order`.
- `QuizAttempt`: user, quiz, status (`IN_PROGRESS`|`COMPLETED`), score?,
  passed?, startedAt, submittedAt.
- `QuizAnswer`: attempt, question, selectedOption, isCorrect.
  Unique `(attemptId, questionId)`.

## Alur Murid

1. Halaman daftar kuis memvalidasi akses (jenjang/kelas/sekolah + jumlah
   attempt yang tersisa) di server; `maxAttempts` dicek sebelum lanjut.
2. Membuka kuis → halaman `quiz/[quizId]` membuat `QuizAttempt`
   (`IN_PROGRESS`) dan mencatat `QUIZ_START` (fire-and-forget).
3. Quiz runner (client React) mengumpulkan jawaban → `saveQuizAnswers`.
4. `submitQuiz` (**server-side scoring**) dalam transaksi:
   - Ambil attempt milik user (bukan user lain).
   - Ambil soal kuis (seed acak bila `shuffle` — urutan opsi tetap).
   - Bandingkan `selectedOption` vs `correctOption`; skor =
     `Σ weight benar / Σ weight * 100` (dibulatkan).
   - `passed = score >= minScore`; set status COMPLETED, submittedAt.
   - Simpan `QuizAnswer` per soal.
   - Catat `QUIZ_SUBMIT` + `revalidatePath`.

## Anti-Cheat / Keamanan

- Penilaian **selalu di server** — jawaban benar tidak pernah dikirim
  ke client sebelum submit.
- Kunci jawaban (`correctOption`) hanya dipakai di `submitQuiz`;
  query untuk runner tidak menyertakannya.
- Attempt divalidasi milik `actor.userId`; user lain tidak bisa submit.
- `maxAttempts` divalidasi ulang server-side.

## Laporan

- Admin/GURU/POLISI melihat agregasi attempt: jumlah attempt, rata-rata
  skor, pass rate, distribusi skor (chart) — semua data disaring sesuai
  scope (GURU = sekolah sendiri; POLISI = lintas sekolah read-only).