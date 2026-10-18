import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { extractQuestionsFromPdf } from "@/lib/pdf-parser";
import { logActivity } from "@/lib/audit";

export const instant = false;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengekstrak PDF" }, { status: 403 });
  }

  const storedName = req.nextUrl.searchParams.get("storedName");
  if (!storedName) return NextResponse.json({ error: "storedName wajib diisi" }, { status: 400 });

  const file = await prisma.uploadedFile.findUnique({ where: { storedName } });
  if (!file || file.kind !== "QUIZ_PDF") {
    return NextResponse.json({ error: "File PDF soal tidak ditemukan" }, { status: 404 });
  }

  const result = await extractQuestionsFromPdf(storedName);
  if (!result.ok) {
    // PDF valid tetapi tidak ada soal terstruktur yang terbaca (hasil scan,
    // format tak standar, dsb). Admin tetap dapat buat draf dan tambahkan soal
    // secara manual. Return hasil kosong (ok) agar form tidak blokir.
    if (result.error.includes("soal pilihan ganda")) {
      return NextResponse.json({
        ok: true,
        fileId: file.id,
        originalName: file.originalName,
        extracted: 0,
        questions: [],
        empty: true,
        warning: result.error,
      });
    }
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  logActivity({
    actorId: user.id,
    action: "QUIZ_PDF_EXTRACT",
    entity: "FILE",
    entityId: file.id,
    metadata: { extracted: result.extracted, originalName: file.originalName },
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    fileId: file.id,
    originalName: file.originalName,
    extracted: result.extracted,
    questions: result.questions,
  });
}