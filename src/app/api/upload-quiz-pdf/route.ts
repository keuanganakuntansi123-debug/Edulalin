import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/storage";

// Fallback sederhana: route ini hanya meneruskan ke /api/upload dengan kind QUIZ_PDF.
// Jika endpoint frontend memakai ini langsung, tetap divalidasi di server.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  const ownerId = String(form.get("ownerId") ?? "");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId wajib diisi" }, { status: 400 });
  }
  try {
    const saved = await saveUploadedFile({ file, kind: "QUIZ_PDF", ownerId });
    return NextResponse.json({ file: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}

export const instant = false;