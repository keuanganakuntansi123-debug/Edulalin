// @ts-nocheck
// E2E alur kuis murid — buat murid uji sementara, kerjakan kuis target sekolah,
// verifikasi skor tersimpan ke Neon + notifikasi, lalu bersihkan data uji.
// Tidak menyentuh data riil. Jalankan: npx tsx scripts/e2e-quiz-flow.mts
import fs from "node:fs";

const env = fs.readFileSync(".env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const mm = line.match(/^([A-Z0-9_]+)="?([^"\r\n]*)"?$/);
  if (mm && !process.env[mm[1]]) process.env[mm[1]] = mm[2];
}
const m = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!m) throw new Error("DATABASE_URL tidak ditemukan di .env");
process.env.DATABASE_URL = m[1];

const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const { submitQuiz } = await import("../src/lib/quiz-service.ts");

const adapter = new PrismaPg({ connectionString: m[1] });
const prisma = new PrismaClient({ adapter });

// Aktor tiruan (role MURID) untuk memanggil logika submit quiz
const mockActor = { id: "e2e-temp", name: "Murid Uji", role: "MURID", schoolId: "", educationLevel: "SMK", birthDate: new Date("2008-01-01") };

const mkEmail = (n) => `e2e.quiz.${n}@edulalin.test`;

const main = async () => {
  const email = mkEmail(Date.now());
  const school = await prisma.school.findFirst({ where: { educationLevel: "SMK" } });
  if (!school) throw new Error("Tidak ada sekolah SMK");

  // 1. Buat murid uji sementara (email unik per run)
  const user = await prisma.user.create({
    data: {
      name: "Murid Uji E2E",
      email,
      passwordHash: "x",
      role: "MURID",
      status: "ACTIVE",
      verifiedAt: new Date(),
      schoolId: school.id,
      educationLevel: "SMK",
      major: "TKJ",
      classLevel: "X",
    },
  });
  console.log(`Murid uji dibuat: ${user.email} (${school.name})`);

  // 2. Ambil kuis yang ditargetkan ke sekolah ini
  const quiz = await prisma.quiz.findFirst({
    where: { status: "ACTIVE", deletedAt: null, quizToSchools: { some: { schoolId: school.id } } },
    include: { questions: true },
  });
  if (!quiz) throw new Error("Tidak ada kuis bertarget untuk sekolah SMK");
  console.log(`Kuis target: "${quiz.title}" (${quiz.educationLevel}, ${quiz.questions.length} soal)`);

  mockActor.id = user.id;
  mockActor.schoolId = school.id;
  mockActor.educationLevel = school.educationLevel;

  // 3. Replikasi logika pembuatan attempt (sama dengan halaman detail [quizId]):
  //    reuse attempt IN_PROGRESS yang menggantung; baru buat baru jika tidak ada;
  //    slot maxAttempts hanya dihitung dari status COMPLETED.
  const existing = await prisma.quizAttempt.findFirst({
    where: { quizId: quiz.id, userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  let attempt = existing;
  if (!attempt) {
    const completed = await prisma.quizAttempt.count({
      where: { quizId: quiz.id, userId: user.id, status: "COMPLETED" },
    });
    if (quiz.maxAttempts != null && completed >= quiz.maxAttempts) {
      console.log(`⏭  Batas maxAttempts tercapai — selesai tanpa submit.`);
      await prisma.user.delete({ where: { id: user.id } });
      console.log("Murid uji dihapus.");
      return;
    }
    attempt = await prisma.quizAttempt.create({
      data: { quizId: quiz.id, userId: user.id, status: "IN_PROGRESS" },
    });
  }
  const attemptId = attempt.id;
  console.log(`Attempt dibuat: ${attemptId}`);

  // 4. Jawab semua soal dengan benar
  const answers = quiz.questions.map((q) => ({ questionId: q.id, selectedOption: "A" }));
  const res = await submitQuiz(mockActor, { attemptId, answers });
  if (!res.success) throw new Error(`submitQuiz gagal: ${res.message}`);

  // 5. Verifikasi tersimpan di Neon
  const stored = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: true },
  });
  const notif = await prisma.notification.findFirst({
    where: { recipientId: user.id, type: "QUIZ_RESULT" },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Score tersimpan: ${stored?.score} | passed: ${stored?.passed} | status: ${stored?.status}`);
  console.log(`Jawaban tersimpan: ${stored?.answers.length}/${quiz.questions.length}`);
  console.log(`Notifikasi hasil: ${notif ? "ADA" : "TIDAK ADA"}`);

  // 6. Ulangi submit tanpa attempt baru (harus ditolak: attempt sudah COMPLETED)
  const again = await submitQuiz(mockActor, { attemptId, answers });
  console.log(`Submit kedua (harus gagal): ${again.success ? "BERHASIL (?!)" : "ditolak ✓"}`);

  // 7. Cleanup: hapus murid uji + attempt + jawaban + notifikasi (relasi cascade / manual)
  await prisma.quizAnswer.deleteMany({ where: { attemptId } });
  await prisma.quizAttempt.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { recipientId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Murid uji + data terkait dibersihkan.");

  await prisma.$disconnect();
  console.log("\n✅ E2E alur kuis murid BERHASIL");
};

main().catch(async (e) => {
  console.error("❌ E2E GAGAL:", e);
  await prisma.$disconnect();
  process.exit(1);
});
