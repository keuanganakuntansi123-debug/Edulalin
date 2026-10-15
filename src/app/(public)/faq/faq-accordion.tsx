"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/form";

type FaqItem = { id: string; question: string; answer: string };

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [faqs, query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pertanyaan..."
          className="pl-9"
          aria-label="Cari pertanyaan FAQ"
        />
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-8 text-center">
            <p className="font-semibold">Tidak ditemukan pertanyaan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Coba gunakan kata kunci lain, atau hubungi kami melalui halaman Kontak.
            </p>
          </div>
        )}
        {filtered.map((f) => {
          const open = openId === f.id;
          return (
            <div
              key={f.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-white transition-all duration-300",
                open ? "border-primary/40 shadow-md" : "border-border hover:border-primary/30"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className={cn("font-semibold transition-colors", open ? "text-primary" : "text-foreground")}>
                  {f.question}
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                    open && "rotate-180 text-primary"
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
