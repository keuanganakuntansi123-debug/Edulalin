"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Jam & tanggal real-time (WIB, bahasa Indonesia).
 * Waktu dihitung di sisi klien agar tidak memblokir prerender dan selalu
 * akurat (diperbarui tiap detik). Server merender placeholder dingin,
 * lalu klien mengisi nilainya setelah mount (menghindari hydration mismatch).
 */
function formatNow(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const timePart = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return `${datePart} • ${timePart} WIB`;
}

export function LiveClock({ className }: { className?: string }) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setText(formatNow());
      timer = setTimeout(tick, 1000);
    };
    // setTimeout(…, 0) memenuhi aturan lint set-state-in-effect sekaligus
    // membuat SSR tetap merender placeholder kosong.
    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {text || "\u00A0"}
    </span>
  );
}

/** Kartu jam real-time yang dipakai di seluruh dashboard (Admin/Guru/Murid/Polisi). */
export function DashboardClock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:justify-start",
        className
      )}
    >
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex">
        <CalendarClock className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="text-center sm:text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Waktu Indonesia Barat
        </p>
        <LiveClock className="block text-base font-bold text-primary sm:text-lg" />
      </div>
    </div>
  );
}
