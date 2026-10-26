"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; variant?: ToastVariant };

type Listener = (t: Omit<Toast, "id">) => void;
let listener: Listener | null = null;

/** Tampilkan notifikasi modern (muncul otomatis, tidak mengganggu tampilan). */
export function toast(t: Omit<Toast, "id">) {
  listener?.(t);
}

const VARIANTS: Record<
  ToastVariant,
  { border: string; bg: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  error: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: "text-red-600",
    Icon: XCircle,
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    icon: "text-sky-600",
    Icon: Info,
  },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  useEffect(() => {
    listener = push;
    return () => {
      listener = null;
    };
  }, [push]);

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      role="region"
      aria-live="polite"
      aria-label="Notifikasi"
    >
      {toasts.map((t) => {
        const variant = t.variant ?? "info";
        const { border, bg, icon, Icon } = VARIANTS[variant];
        return (
          <div
            key={t.id}
            className={`animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border ${border} ${bg} p-4 shadow-lg shadow-slate-900/5 backdrop-blur`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-sm break-words text-slate-600">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}