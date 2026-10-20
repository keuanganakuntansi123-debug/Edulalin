"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function ShareArticleButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/berita/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — abaikan
    }
  };

  return (
    <div className="mt-3 flex gap-2">
      <input
        readOnly
        value={`${typeof window !== "undefined" ? window.location.origin : ""}/berita/${slug}`}
        className="min-w-0 flex-1 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs text-muted-foreground"
        aria-label="Tautan artikel"
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : "Salin"}
      </button>
    </div>
  );
}