/**
 * Persiapan global untuk pdfjs-dist (dipakai pdf-parse) di lingkungan server.
 *
 * Latar belakang error "DOMMatrix is not defined":
 * pdfjs-dist mengevaluasi `const SCALE_MATRIX = new DOMMatrix()` saat modul
 * dimuat. Pada Node, pdfjs mencoba memuat `@napi-rs/canvas` melalui `require`
 * dinamis untuk mem-polyfill DOMMatrix. Di bawah Turbopack/Next.js `require`
 * dinamis ini gagal di-resolve, sehingga DOMMatrix tetap undefined dan modul
 * melempar error saat dievaluasi.
 *
 * Solusi: polyfill global DOMMatrix/DOMPoint/Path2D/ImageData dari
 * `@napi-rs/canvas` SEBELUM pdf-parse di-import.
 */
let initialized = false;

/**
 * Preload worker pdfjs agar pdf-parse tidak perlu melakukan dynamic
 * `import(workerSrc)` yang gagal di bawah Turbopack/Next.js/Vercel dengan
 * error: `Setting up fake worker failed: Cannot find module pdf.worker.mjs`.
 *
 * pdfjs-dist (Node) mengeset `GlobalWorkerOptions.workerSrc ||= "./pdf.worker.mjs"`
 * lalu, saat worker tidak tersedia, mencoba `await import(this.workerSrc)` secara
 * dinamis. Impor dinamis tersebut gagal di-resolve oleh bundler sehingga
 * worker tidak pernah dibuat dan parsing PDF gagal.
 *
 * Solusi: impor statis worker terlebih dahulu dan pasang ke `globalThis.pdfjsWorker`.
 * pdfjs membaca `globalThis.pdfjsWorker.WorkerMessageHandler` sebagai
 * `#mainThreadWorkerMessageHandler` sehingga jalur "fake worker" tidak pernah
 * dieksekusi (lihat PDFWorker._setupFakeWorkerGlobal di pdf.mjs).
 */
async function ensurePdfWorker(): Promise<void> {
  if (typeof (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker !== "undefined") return;
  try {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = worker;
  } catch (e) {
    // Jika worker tak termuat, pdfjs akan mencoba fallback impor dinamis.
    console.warn("Gagal memuat pdf.worker.mjs untuk pdf-parse:", e);
  }
}

export async function ensurePdfGlobals(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await ensurePdfWorker();

  if (typeof globalThis.DOMMatrix !== "undefined") return;

  try {
    const canvas = await import("@napi-rs/canvas");
    if (typeof globalThis.DOMMatrix === "undefined" && canvas.DOMMatrix) {
      globalThis.DOMMatrix = canvas.DOMMatrix as unknown as typeof DOMMatrix;
    }
    if (typeof globalThis.DOMPoint === "undefined" && canvas.DOMPoint) {
      globalThis.DOMPoint = canvas.DOMPoint as unknown as typeof DOMPoint;
    }
    if (typeof globalThis.Path2D === "undefined" && canvas.Path2D) {
      globalThis.Path2D = canvas.Path2D as unknown as typeof Path2D;
    }
    if (typeof globalThis.ImageData === "undefined" && canvas.ImageData) {
      globalThis.ImageData = canvas.ImageData as unknown as typeof ImageData;
    }
    if (!globalThis.navigator?.language) {
      // pdfjs membaca navigator.language; pastikan tersedia di Node.
      (globalThis as unknown as { navigator: unknown }).navigator = {
        language: "en-US",
        platform: "",
        userAgent: "",
      };
    }
  } catch (e) {
    // Jangan gagalkan parsing jika polyfill tidak tersedia — pdfjs tetap
    // bisa mengekstrak teks untuk dokumen tanpa rendering.
    console.warn("Gagal memuat @napi-rs/canvas untuk polyfill DOMMatrix:", e);
  }
}
