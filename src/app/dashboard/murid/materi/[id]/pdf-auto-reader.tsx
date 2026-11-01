"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { saveProgressAction } from "@/app/actions/murid-actions";

type Props = {
  moduleId: string;
  fileUrl: string;
  title: string;
  initialPage?: number | null;
  initialProgress?: number;
  initialTotalPages?: number | null;
  readOnly?: boolean;
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<unknown>;
  destroy: () => Promise<void>;
};

/**
 * Pembaca PDF dengan pelacakan progres otomatis.
 * Progres dihitung dari halaman UNIK yang benar-benar dibuka murid
 * (dibuka / total halaman), bukan dari slider manual. Halaman terakhir
 * disimpan otomatis sehingga murid dapat melanjutkan bacaan (resume).
 * Data progres juga menjadi sumber Pemantauan Modul Guru.
 */
export function PdfAutoReader({
  moduleId,
  fileUrl,
  title,
  initialPage,
  initialProgress = 0,
  initialTotalPages,
  readOnly = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const viewedRef = useRef<Set<number>>(new Set());
  const seededRef = useRef(false);
  const maxProgressRef = useRef(initialProgress);
  const savedRef = useRef<{ progress: number; page: number }>({ progress: -1, page: -1 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [total, setTotal] = useState(initialTotalPages ?? 0);
  const [page, setPage] = useState(Math.max(1, initialPage ?? 1));
  const [progress, setProgress] = useState(initialProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [saving, startSave] = useTransition();

  const persist = useCallback(
    (nextProgress: number, nextPage: number, pages: number) => {
      if (readOnly) return;
      if (savedRef.current.progress === nextProgress && savedRef.current.page === nextPage) return;
      savedRef.current = { progress: nextProgress, page: nextPage };
      startSave(async () => {
        const fd = new FormData();
        fd.set("moduleId", moduleId);
        fd.set("progress", String(nextProgress));
        if (nextPage) fd.set("lastPage", String(nextPage));
        if (pages) fd.set("totalPages", String(pages));
        const res = await saveProgressAction(fd);
        if (res && "error" in res) {
          toast({ title: "Gagal menyimpan progres", description: String(res.error), variant: "error" });
        }
      });
    },
    [moduleId, readOnly]
  );

  const computeProgress = useCallback((pages: number) => {
    if (!pages) return 0;
    const read = viewedRef.current.size;
    if (read === 0) return 0;
    return Math.min(100, Math.round((read / pages) * 100));
  }, []);

  const renderPage = useCallback(
    async (doc: PdfDoc, pageNumber: number) => {
      const target = canvasRef.current;
      if (!target) return;
      const p = (await doc.getPage(pageNumber)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: {
          canvas: HTMLCanvasElement;
          canvasContext: CanvasRenderingContext2D;
          viewport: unknown;
        }) => {
          promise: Promise<void>;
          cancel: () => void;
        };
      };
      const containerWidth = containerRef.current?.clientWidth ?? 720;
      const base = p.getViewport({ scale: 1 });
      const scale = Math.min(2.2, Math.max(0.6, containerWidth / base.width));
      const viewport = p.getViewport({ scale });
      const ctx = target.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      target.width = Math.floor(viewport.width * dpr);
      target.height = Math.floor(viewport.height * dpr);
      target.style.width = `${Math.floor(viewport.width)}px`;
      target.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderTaskRef.current?.cancel();
      const task = p.render({ canvas: target, canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => undefined);
    },
    []
  );

  // Muat dokumen sekali.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = (await pdfjs.getDocument({ url: fileUrl }).promise) as unknown as PdfDoc;
        if (cancelled) {
          doc.destroy().catch(() => undefined);
          return;
        }
        docRef.current = doc;
        setTotal(doc.numPages);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Gagal memuat PDF");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      docRef.current?.destroy().catch(() => undefined);
      docRef.current = null;
    };
  }, [fileUrl]);

  // Render halaman aktif + catat sebagai sudah dibaca.
  useEffect(() => {
    const doc = docRef.current;
    if (!doc || loading || !total) return;
    const current = Math.min(Math.max(1, page), total);
    void renderPage(doc, current);

    // Pulihkan halaman yang sudah pernah dibaca dari progres tersimpan, supaya
    // membuka kembali modul tidak menurunkan progres (mis. 50% → 10%).
    if (!seededRef.current) {
      seededRef.current = true;
      const readCount = Math.round((initialProgress / 100) * total);
      for (let i = 1; i <= readCount; i += 1) viewedRef.current.add(i);
    }

    viewedRef.current.add(current);
    // Progres tidak pernah turun, hanya bertambah.
    const next = Math.max(computeProgress(total), maxProgressRef.current);
    maxProgressRef.current = next;
    setProgress(next);

    // Simpan otomatis (debounce) agar tidak membanjiri server saat navigasi cepat.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next, current, total), 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [page, loading, total, renderPage, computeProgress, persist, initialProgress]);

  // Simpan saat murid menutup/meninggalkan halaman.
  useEffect(() => {
    if (readOnly) return;
    const flush = () => {
      const doc = docRef.current;
      if (!doc) return;
      const p = Math.max(computeProgress(doc.numPages), maxProgressRef.current);
      const data = new FormData();
      data.set("moduleId", moduleId);
      data.set("progress", String(p));
      data.set("lastPage", String(page));
      data.set("totalPages", String(doc.numPages));
      // Kirim lewat fetch agar tetap terkirim saat halaman ditinggalkan.
      void fetch("/api/module-progress", { method: "POST", body: data, keepalive: true });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [moduleId, page, computeProgress, readOnly]);

  const go = (delta: number) => {
    setPage((p) => Math.min(Math.max(1, p + delta), total || 1));
  };

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Pratinjau PDF tidak dapat dimuat ({error}). Silakan unduh berkas modul.
      </div>
    );
  }

  return (
    <div className={expanded ? "fixed inset-0 z-50 overflow-auto bg-slate-900/95 p-3" : ""}>
      <div className={expanded ? "mx-auto max-w-5xl rounded-xl bg-white p-3" : ""}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => go(-1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Halaman {page} / {total || "…"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => go(1)}
              disabled={!total || page >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <span className="text-xs text-muted-foreground">Mode baca</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {saving ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…
                  </span>
                ) : (
                  "Progres tersimpan otomatis"
                )}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Keluar layar penuh" : "Layar penuh"}
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Progres membaca {progress}% — dihitung dari halaman yang benar-benar Anda buka.
        </p>

        <div
          ref={containerRef}
          className="flex max-h-[70vh] justify-center overflow-auto rounded-lg border border-border bg-slate-100 p-2"
        >
          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat {title}…
            </div>
          ) : (
            <canvas ref={canvasRef} className="max-w-full shadow-sm" aria-label={`Halaman ${page} dari ${title}`} />
          )}
        </div>
      </div>
    </div>
  );
}
