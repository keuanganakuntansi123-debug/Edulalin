"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Video, Link2, File, Lock, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryOf } from "@/lib/constants";
import { cn } from "@/lib/utils";

type DisplayModule = {
  id: string;
  title: string;
  description: string;
  educationLevel: string;
  moduleType: string;
  displayThumbnail: string | null;
};

const TYPE_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: Link2,
  DOCUMENT: File,
};

const CATEGORY_LABEL: Record<string, string> = {
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA/SMK",
  SMK: "SMK",
};

const CATEGORY_EMOJI: Record<string, string> = {
  SD: "🧒",
  SMP: "🧑",
  SMA: "🧑‍🎓",
  SMK: "👷",
};

export function ModuleCarousel({ modules }: { modules: DisplayModule[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, modules.length]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onScrollSnap = () => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    if (!card) return;
    const index = Math.round(el.scrollLeft / (card.offsetWidth + 16));
    setActiveIndex(Math.max(0, Math.min(modules.length - 1, index)));
  };

  return (
    <div className="relative">
      {/* Panah kiri */}
      <button
        type="button"
        aria-label="Geser ke kiri"
        onClick={() => scrollByCard(-1)}
        disabled={!canPrev}
        className="absolute -left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-0 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Track carousel */}
      <div
        ref={trackRef}
        onScroll={onScrollSnap}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {modules.map((m) => {
          const Icon = TYPE_ICON[m.moduleType] ?? FileText;
          const cat = categoryOf(m.educationLevel);
          return (
            <article
              key={m.id}
              data-carousel-card
              className="group flex w-70 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-75"
            >
              {/* Thumbnail */}
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 to-sky-100">
                {m.displayThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.displayThumbnail}
                    alt={m.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-8 w-8" />
                  </span>
                )}
                <Badge className="absolute left-3 top-3 bg-white/95 text-primary shadow-sm">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {CATEGORY_LABEL[cat] ?? "Lainnya"}
                </Badge>
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-sm">
                  <Lock className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Konten */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-bold leading-snug line-clamp-1">{m.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="secondary">{CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}</Badge>
                  {m.educationLevel === "SIM" && (
                    <Badge className="bg-sky-100 text-sky-700">🪪 SIM</Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4">
                  <Link href="/login" className="flex-1">
                    <Button size="sm" className="w-full">
                      <Lock className="mr-1 h-3.5 w-3.5" />
                      Masuk untuk Belajar
                    </Button>
                  </Link>
                </div>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Pratinjau • login untuk mengakses materi
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Panah kanan */}
      <button
        type="button"
        aria-label="Geser ke kanan"
        onClick={() => scrollByCard(1)}
        disabled={!canNext}
        className="absolute -right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-lg transition-all hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-0 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Indikator */}
      {modules.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {modules.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-label={`Ke card ${i + 1}`}
              onClick={() => {
                const el = trackRef.current;
                const card = el?.querySelector<HTMLElement>("[data-carousel-card]");
                if (!el || !card) return;
                el.scrollTo({ left: i * (card.offsetWidth + 16), behavior: "smooth" });
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                activeIndex === i ? "w-6 bg-primary" : "w-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
