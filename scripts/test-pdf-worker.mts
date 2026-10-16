/**
 * Uji cepat perbaikan worker pdfjs-dist untuk Next.js/Vercel.
 * Menjalankan ekstraksi teks dari PDF tanpa error "fake worker".
 */
import fs from "node:fs/promises";

// ===== Pola perbaikan (akan dipindah ke src/lib/pdf-setup.ts) =====
const fixPdfWorker = async () => {
  if (typeof (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker !== "undefined") return;
  // Impor statis worker — bundler Next.js/Turbopack akan menyertakannya,
  // sehingga pdfjs tidak perlu melakukan dynamic import(workerSrc).
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = worker;
  return worker;
};

async function main() {
  await fixPdfWorker();

  const { PDFParse } = await import("pdf-parse");
  const filePath = process.argv[2];
  const parser = new PDFParse({ data: await fs.readFile(filePath) });
  try {
    const text = await parser.getText();
    const raw = String(text.text ?? "");
    console.log("Teks terbaca (chars):", raw.length);
    console.log("---- Cuplikan awal ----");
    console.log(raw.slice(0, 1500));
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error("GAGAL:", e);
  process.exit(1);
});
