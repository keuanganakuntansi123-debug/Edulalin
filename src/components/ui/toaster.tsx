"use client";

import { useCallback, useEffect, useState } from "react";

type Toast = { id: number; title: string; description?: string; variant?: "success" | "error" | "info" };

type Listener = (t: Omit<Toast, "id">) => void;
let listener: Listener | null = null;

export function toast(t: Omit<Toast, "id">) {
  listener?.(t);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    listener = push;
    return () => {
      listener = null;
    };
  }, [push]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg border bg-white p-4 shadow-lg ${
            t.variant === "error" ? "border-red-200" : t.variant === "success" ? "border-emerald-200" : "border-border"
          }`}
        >
          <p className="text-sm font-semibold">{t.title}</p>
          {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}