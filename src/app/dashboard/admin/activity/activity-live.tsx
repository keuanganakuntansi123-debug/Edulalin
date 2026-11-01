"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

/**
 * Penyegar otomatis daftar Aktivitas Sistem (real-time).
 *
 * Memanggil `router.refresh()` secara berkala agar aktivitas Login, Logout,
 * dan Reset Password baru langsung muncul tanpa refresh manual. Tidak memakai
 * state React sehingga aman dari aturan lint `set-state-in-effect`.
 */
export function ActivityLive({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <Radio className="h-3.5 w-3.5 animate-pulse" />
      Real-time
    </span>
  );
}
