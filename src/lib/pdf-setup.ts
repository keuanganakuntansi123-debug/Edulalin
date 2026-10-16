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

export async function ensurePdfGlobals(): Promise<void> {
  if (initialized) return;
  initialized = true;

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
