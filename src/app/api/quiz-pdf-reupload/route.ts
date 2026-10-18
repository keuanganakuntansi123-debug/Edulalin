import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile, removeStoredFile } from "@/lib/storage";
import { extractQuestionsFromPdf } from "@/lib/pdf-parser";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { ParsedQuestion } from "@/lib/pdf-parser";

export const instant = false;

function toReviewQuestions(questions: ParsedQuestion[]) {
  return questions.map((q) => ({
    text: q.text,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    answer: q.answer ?? null,
    explanation: q.explanation ?? null,
  }));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengganti PDF kuis" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const quizId = String(form.get("quizId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (!quizId) {
    return NextResponse.json({ error: "quizId wajib diisi" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, deletedAt: null } });
  if (!quiz) return NextResponse.json({ error: "Kuis tidak ditemukan" }, { status: 404 });
  if (quiz.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Hanya kuis draf yang dapat diganti file PDF. Ardupkan kuis atau buat draf baru." },
      { status: 409 }
    );
  }
  const attemptCount = await prisma.quizAttempt.count({ where: { quizId: quiz.id } });
  if (attemptCount > 0) {
    return NextResponse.json(
      { error: "Kuis ini sudah memiliki pengerjaan. Hapus pengerjaan terlebih dahulu sebelum mengganti file." },
      { status: 409 }
    );
  }

  let saved: { id: string; url: string; originalName: string; mimeType: string; size: number };
  try {
    saved = await saveUploadedFile({ file, kind: "QUIZ_PDF", ownerId: user.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal mengunggah PDF baru" },
      { status: 400 }
    );
  }

  const result = await extractQuestionsFromPdf(saved.url.split("/").pop() ?? saved.id);
  if (!result.ok) {
    removeStoredFile(saved.url.split("/").pop() ?? saved.id).catch(() => undefined);
    await prisma.uploadedFile.delete({ where: { id: saved.id } }).catch(() => undefined);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const oldSourceFileId = quiz.sourceFileId;
  const review = toReviewQuestions(result.questions);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { sourceType: "PDF", sourceFileId: saved.id, status: "DRAFT" },
      });
      await tx.quizQuestion.createMany({
        data: result.questions.map((q, idx) => ({
          quizId: quiz.id,
          text: q.text,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.answer ?? null,
          explanation: q.explanation ?? null,
          order: idx + 1,
        })),
      });
    });
  } catch (e) {
    // Jika transaksi gagal, bersihkan file baru agar tidak ada file orfan.
    removeStoredFile(saved.url.split("/").pop() ?? saved.id).catch(() => undefined);
    await prisma.uploadedFile.delete({ where: { id: saved.id } }).catch(() => undefined);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memperbarui draf dengan PDF baru" },
      { status: 500 }
    );
  }

  if (oldSourceFileId && oldSourceFileId !== saved.id) {
    const old = await prisma.uploadedFile.findUnique({ where: { id: oldSourceFileId } });
    if (old && old.kind === "QUIZ_PDF") {
      removeStoredFile(old.storedName).catch(() => undefined);
      await prisma.uploadedFile.delete({ where: { id: old.id } }).catch(() => undefined);
    }
  }

  logActivity({
    actorId: user.id,
    action: "QUIZ_PDF_REUPLOAD",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title, extracted: result.extracted, originalName: saved.originalName },
  }).catch(() => undefined);
  revalidatePath(`/dashboard/admin/quizzes/${quiz.id}`);
  revalidatePath("/dashboard/admin/quizzes");

  return NextResponse.json({
    ok: true,
    fileId: saved.id,
    storedName: saved.url.split("/").pop(),
    originalName: saved.originalName,
    extracted: review.length,
    questions: review,
  });
}