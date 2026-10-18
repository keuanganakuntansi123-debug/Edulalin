import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logActivity } from "@/lib/audit";
import { z } from "zod";
import { validateCategorySchoolMatch } from "@/lib/module-service";

export const instant = false;

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).default(60),
  moduleId: z.string().optional().nullable(),
  schoolIds: z.array(z.string()).default([]),
  sourceFileId: z.string().min(1),
  educationLevel: z.string().optional().nullable(),
  shuffle: z.boolean().default(false),
  showDiscussion: z.boolean().default(true),
  showResult: z.boolean().default(true),
  questions: z
    .array(
      z.object({
        text: z.string().min(3),
        optionA: z.string().min(1),
        optionB: z.string().min(1),
        optionC: z.string().min(1),
        optionD: z.string().min(1),
        answer: z.enum(["A", "B", "C", "D"]).optional().nullable(),
        explanation: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya admin yang dapat membuat kuis dari PDF" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

  const data = parsed.data;
  // Validasi sekolah tujuan terdaftar
  if (data.schoolIds.length) {
    const count = await prisma.school.count({ where: { id: { in: data.schoolIds } } });
    if (count !== data.schoolIds.length) {
      return NextResponse.json({ error: "Sekolah tujuan tidak valid" }, { status: 400 });
    }
  }
  const rawLevel = (data.educationLevel ?? "").toUpperCase();
  const levelMatch = await validateCategorySchoolMatch(rawLevel, data.schoolIds);
  if (levelMatch.error) {
    return NextResponse.json({ error: levelMatch.error }, { status: 400 });
  }
  const educationLevel = levelMatch.level;

  const file = await prisma.uploadedFile.findUnique({ where: { id: data.sourceFileId } });
  if (!file || file.kind !== "QUIZ_PDF") {
    return NextResponse.json({ error: "File PDF soal tidak ditemukan" }, { status: 404 });
  }

  // Jika admin sudah mengedit hasil ekstraksi di pratinjau, gunakan hasil itu
  // langsung. Jika tidak, ekstrak lagi dari file sumber.
  let extractedQuestions: {
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    answer: string | null;
    explanation: string | null;
  }[];
  if (data.questions) {
    extractedQuestions = data.questions.map((q) => ({
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      answer: q.answer ?? null,
      explanation: q.explanation ?? null,
    }));
  } else {
    const { extractQuestionsFromPdf } = await import("@/lib/pdf-parser");
    const result = await extractQuestionsFromPdf(file.storedName);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    extractedQuestions = result.questions.map((q) => ({
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      answer: q.answer ?? null,
      explanation: q.explanation ?? null,
    }));
  }

  // Simpan draft — admin WAJIB memeriksa sebelum menerbitkan
  const quiz = await prisma.$transaction(async (tx) => {
    const created = await tx.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        sourceType: "PDF",
        sourceFileId: file.id,
        moduleId: data.moduleId || null,
        educationLevel,
        classLevel: null,
        minScore: data.minScore,
        shuffle: data.shuffle,
        showDiscussion: data.showDiscussion,
        showResult: data.showResult,
        status: "DRAFT",
        quizToSchools: data.schoolIds.length
          ? { create: data.schoolIds.map((schoolId) => ({ schoolId })) }
          : undefined,
      },
    });
    await tx.quizQuestion.createMany({
      data: extractedQuestions.map((q, idx) => ({
        quizId: created.id,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.answer,
        explanation: q.explanation,
        order: idx + 1,
      })),
    });
    return created;
  });

  logActivity({
    actorId: user.id,
    schoolId: undefined,
    action: "QUIZ_PDF_CREATE",
    entity: "QUIZ",
    entityId: quiz.id,
    metadata: { title: quiz.title, extracted: extractedQuestions.length },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, id: quiz.id, extracted: extractedQuestions.length });
}