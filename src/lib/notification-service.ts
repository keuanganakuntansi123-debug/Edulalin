import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { formatDateTimeWib } from "@/lib/format-wib";
import { getAge } from "@/lib/constants";
import type { EducationLevel } from "@/generated/prisma/client";

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

/** Buat notifikasi untuk seluruh Admin aktif (lonceng dashboard Admin). */
export async function notifyPasswordRequestToAdmins(params: {
  requestId: string;
  name: string;
  email: string;
  roleLabel: string;
  submittedAt: Date;
  summary: string;
}): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  if (admins.length === 0) return 0;

  const body = `${params.name} (${params.email}) — ${params.roleLabel}. ${params.summary} Dikirim ${formatDateTimeWib(
    params.submittedAt
  )}.`;

  try {
    await prisma.$transaction(
      admins.map((a) =>
        prisma.notification.create({
          data: {
            recipientId: a.id,
            type: "PASSWORD_RESET_REQUEST",
            title: "Pengajuan Lupa Password Baru",
            body,
            link: "/dashboard/admin/password-requests",
          },
        })
      )
    );
  } catch (e) {
    await logActivity({
      action: "PASSWORD_REQUEST_NOTIFY_FAILED",
      entity: "PASSWORD_RESET_REQUEST",
      entityId: params.requestId,
      metadata: { error: e instanceof Error ? e.message : String(e) },
    }).catch(() => undefined);
    return 0;
  }
  return admins.length;
}

/**
 * Beri tahu pemilik akun (lonceng) bahwa password berhasil diperbarui.
 * Dipakai baik saat Admin memproses pengajuan maupun saat pengguna mengubah
 * password sendiri. Tidak memuat password baru.
 */
export async function notifyPasswordChanged(params: {
  userId: string;
  name: string;
  changedAt: Date;
  changedByLabel: string;
  method: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientId: params.userId,
        type: "PASSWORD_CHANGED",
        title: "Password Akun Berhasil Diperbarui",
        body: `Password akun Anda diperbarui pada ${formatDateTimeWib(
          params.changedAt
        )} oleh ${params.changedByLabel} (${params.method}). Bila bukan Anda, segera hubungi Admin.`,
        link: "/dashboard/profil",
      },
    });
  } catch (e) {
    await logActivity({
      actorId: params.userId,
      action: "PASSWORD_CHANGED_NOTIFY_FAILED",
      entity: "USER",
      entityId: params.userId,
      metadata: { error: e instanceof Error ? e.message : String(e) },
    }).catch(() => undefined);
  }
}

/** Peta label kategori modul untuk notifikasi. */
function moduleLevelLabel(level: string): string {
  switch (level) {
    case "SIM":
      return "SIM (Surat Izin Mengemudi)";
    case "SMA":
      return "SMA";
    case "SMK":
      return "SMK";
    case "SMP":
      return "SMP";
    case "SD":
      return "SD";
    default:
      return level;
  }
}

/**
 * Notifikasi lonceng modul baru bagi Murid, Guru, dan Polisi.
 *
 * - Murid & Guru: hanya sekolah tujuan (atau semua sekolah sesuai jenjang bila
 *   modul global).
 * - Polisi: seluruh Polisi aktif sesuai hak akses pemantauan (read-only).
 * - Modul SIM hanya untuk murid SMA/SMK berusia >= 17 tahun dan guru SMA/SMK.
 */
export async function notifyNewModule(params: {
  actorId: string;
  actorName: string;
  moduleId: string;
  title: string;
  educationLevel: string;
  schoolId: string | null;
  schoolIds: string[];
  publishedAt: Date;
}): Promise<{ recipients: number }> {
  const isSim = params.educationLevel === "SIM";
  const levelFilter: EducationLevel[] = isSim
    ? ["SMA", "SMK"]
    : ([params.educationLevel].filter((l): l is EducationLevel =>
        ["SD", "SMP", "SMA", "SMK"].includes(l)
      ) as EducationLevel[]);

  const targetSchools = params.schoolIds.length
    ? params.schoolIds
    : params.schoolId
      ? [params.schoolId]
      : [];
  const isGlobal = targetSchools.length === 0;

  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        { role: "POLISI" },
        {
          role: { in: ["MURID", "GURU"] },
          ...(levelFilter.length ? { educationLevel: { in: levelFilter } } : {}),
          ...(isGlobal ? {} : { schoolId: { in: targetSchools } }),
        },
      ],
    },
    select: { id: true, role: true, birthDate: true },
  });

  const recipients = candidates.filter((u) => {
    if (u.role !== "MURID") return true;
    if (!isSim) return true;
    // Modul SIM: hanya murid berusia >= 17 tahun.
    return u.birthDate ? getAge(u.birthDate) >= 17 : false;
  });
  if (recipients.length === 0) return { recipients: 0 };

  const levelLabel = moduleLevelLabel(params.educationLevel);
  const link = (role: string) =>
    role === "MURID"
      ? `/dashboard/murid/materi/${params.moduleId}`
      : role === "GURU"
        ? "/dashboard/guru/modules"
        : "/dashboard/polisi/modul";

  const body = `Modul baru "${params.title}" (Kategori ${levelLabel}) telah dibagikan pada ${formatDateTimeWib(
    params.publishedAt
  )}. Klik untuk membuka modul.`;

  try {
    await prisma.$transaction(
      recipients.map((r) =>
        prisma.notification.create({
          data: {
            recipientId: r.id,
            type: "MODULE_NEW",
            title: `Modul Baru: ${params.title}`,
            body,
            link: link(r.role),
          },
        })
      )
    );
  } catch (e) {
    await logActivity({
      actorId: params.actorId,
      action: "MODULE_NOTIFY_FAILED",
      entity: "MODULE",
      entityId: params.moduleId,
      metadata: { error: e instanceof Error ? e.message : String(e) },
    }).catch(() => undefined);
    return { recipients: 0 };
  }

  await logActivity({
    actorId: params.actorId,
    action: "MODULE_NOTIFY_SENT",
    entity: "MODULE",
    entityId: params.moduleId,
    metadata: { recipients: recipients.length, title: params.title },
  }).catch(() => undefined);

  return { recipients: recipients.length };
}
