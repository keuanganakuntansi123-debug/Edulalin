import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

/**
 * Buat notifikasi hasil kuis untuk Guru & Polisi.
 * - Guru: hanya untuk murid dari sekolah tempat guru mengajar.
 * - Polisi: seluruh sekolah (read-only monitoring).
 * - Notifikasi hasil pengerjaan Polisi TIDAK dikirim ke guru/polisi lain.
 */
export async function notifyQuizResult(params: {
  actorId: string;
  actorRole: "MURID" | "POLISI" | "ADMIN" | "GURU";
  actorName: string;
  schoolId: string | null;
  quizId: string;
  quizTitle: string;
  attemptId: string;
  score: number;
  passed: boolean;
}): Promise<void> {
  const { actorRole, actorName, schoolId, quizId, quizTitle, attemptId, score, passed } = params;
  if (actorRole !== "MURID") return;

  // Kumpulkan penerima: semua GURU di sekolah + semua POLISI aktif.
  const recipients = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        { role: "GURU", schoolId: schoolId ?? "__none__" },
        { role: "POLISI" },
      ],
    },
    select: { id: true, role: true },
  });
  if (recipients.length === 0) return;

  const statusText = passed ? "lulus" : "belum lulus";
  const title = `Kuis selesai: ${quizTitle}`;
  const body = `${actorName} menyelesaikan kuis "${quizTitle}" dengan nilai ${score}/100 (${statusText}).`;

  try {
    await prisma.$transaction(
      recipients.map((r) =>
        prisma.notification.create({
          data: {
            recipientId: r.id,
            type: "QUIZ_RESULT",
            title,
            body,
            link: r.role === "GURU" ? `/dashboard/guru/quiz/${attemptId}` : `/dashboard/polisi/kuis/${attemptId}`,
          },
        })
      )
    );
  } catch (e) {
    logActivity({
      actorId: params.actorId,
      schoolId,
      action: "QUIZ_NOTIFY_FAILED",
      entity: "QUIZ",
      entityId: quizId,
      metadata: { attemptId, error: e instanceof Error ? e.message : String(e) },
    }).catch(() => undefined);
  }
}
