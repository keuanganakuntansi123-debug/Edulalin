import fs from "node:fs/promises";
import { getStoredFilePath } from "@/lib/storage";
import { ensurePdfGlobals } from "@/lib/pdf-setup";

export type ParsedQuestion = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer?: string; // 'A' | 'B' | 'C' | 'D' bila terbaca dari PDF
};

/**
 * Baca teks PDF lalu susun soal pilihan ganda.
 * Mendukung:
 *  - "1. Pertanyaan" / "1) Pertanyaan" / "1. Pertanyaan ?"
 *  - Opsi A/B/C/D (dengan variasi a., b., c., d., A., B., dsb.)
 *  - Kunci jawaban berupa baris "Kunci Jawaban: A", "Jawaban: B", "KUNCI: C", atau
 *    "1. A" pada blok kunci di bagian akhir dokumen.
 */
export async function extractQuestionsFromPdf(
  storedName: string
): Promise<{ ok: true; extracted: number; questions: ParsedQuestion[] } | { ok: false; error: string }> {
  const filePath = await getStoredFilePath(storedName);
  if (!filePath) return { ok: false, error: "File tidak ditemukan di server" };

  let raw: string;
  try {
    // Polyfill DOMMatrix/DOMPoint/Path2D/ImageData sebelum pdfjs-dist di-load
    // (mencegah error "DOMMatrix is not defined" di bawah Turbopack/Next.js).
    await ensurePdfGlobals();
    // pdf-parse v2: class PDFParse dengan getText()
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: await fs.readFile(filePath) });
    try {
      const text = await parser.getText();
      raw = String(text.text ?? "");
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } catch (e) {
    return { ok: false, error: `Gagal membaca PDF: ${e instanceof Error ? e.message : "format tidak didukung"}` };
  }

  if (!raw.trim()) return { ok: false, error: "Tidak ada teks yang terbaca dari PDF" };

  // Potong baris kosong berlebih & rapikan
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Ekstrak kunci jawaban jika ada (hanya huruf A-D di akhir baris, atau format "1. A")
  const answerByIndex = new Map<number, string>();
  // Format "12. C" dalam blok kunci
  lines.forEach((line) => {
    const numbered = line.match(/^(\d{1,3})\s*[.)-]+\s*([A-Da-d])$/);
    if (numbered) {
      const idx = Number(numbered[1]);
      const opt = numbered[2].toUpperCase();
      if (idx >= 1 && ["A", "B", "C", "D"].includes(opt)) {
        answerByIndex.set(idx, opt);
      }
    }
  });
  // Format "Kunci Jawaban: 1.A 2.B ..." / "1-A"
  const keyLine = lines
    .map((l) => l.toLowerCase())
    .find((l) => /(kunci|jawaban)\s*(jawaban)?\s*:/.test(l) && /[1-9]/.test(l));
  if (keyLine) {
    const pairs = keyLine.match(/(\d{1,3})\s*[.)\-]?\s*([A-Da-d])/g) ?? [];
    for (const pair of pairs) {
      const m = pair.match(/(\d{1,3})\s*[.)\-]?\s*([A-Da-d])/);
      if (m) answerByIndex.set(Number(m[1]), m[2].toUpperCase());
    }
  }

  // Bangun kumpulan soal
  const questions: ParsedQuestion[] = [];
  let currentIndex = 0;
  let current: { text: string; options: Map<string, string> } | null = null;

  const questionRe = /^(?:(\d{1,3})\s*[.)]\s*|\*\s*)(.+)$/;
  const answerRe = /^([A-Da-d])\s*[.)\]:]?\s*(.+)$/;

  for (const line of lines) {
    const qMatch = line.match(questionRe);
    if (qMatch) {
      const num = qMatch[1] ? Number(qMatch[1]) : currentIndex + 1;
      if (current && current.options.size >= 3) {
        questions.push(finalizeQuestion(current, answerByIndex, currentIndex));
      }
      currentIndex = num - 1 < 0 ? questions.length : num - 1;
      current = { text: qMatch[2], options: new Map() };
      continue;
    }
    if (!current) continue;
    const aMatch = line.match(answerRe);
    if (aMatch) {
      const key = aMatch[1].toUpperCase();
      // Hanya simpan jika belum ada, hindari baris "A" palsu
      if (!current.options.has(key)) {
        current.options.set(key, aMatch[2]);
      }
      continue;
    }
    // Lanjutan deskripsi soal bila bukan opsi (dan masih kosong opsi)
    if (current.options.size === 0) {
      current.text += " " + line;
    }
  }
  if (current && current.options.size >= 3) {
    questions.push(finalizeQuestion(current, answerByIndex, currentIndex));
  }

  if (questions.length === 0) {
    return { ok: false, error: "Tidak ditemukan soal pilihan ganda pada PDF" };
  }

  return { ok: true, extracted: questions.length, questions };
}

function finalizeQuestion(
  current: { text: string; options: Map<string, string> },
  answerByIndex: Map<number, string>,
  index: number
): ParsedQuestion {
  const get = (k: string) => current.options.get(k) ?? "";
  return {
    text: current.text,
    optionA: get("A"),
    optionB: get("B"),
    optionC: get("C"),
    optionD: get("D"),
    answer: answerByIndex.get(index + 1),
  };
}