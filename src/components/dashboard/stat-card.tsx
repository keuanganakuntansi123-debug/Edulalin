import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kartu statistik modern untuk dashboard semua role.
 * Menampilkan ikon berwarna dalam kotak gradasi, nilai besar,
 * label, dan panah indikator untuk halaman tujuan.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "blue",
  suffix,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  accent?: "blue" | "emerald" | "purple" | "amber" | "sky" | "rose";
  suffix?: string;
}) {
  const accents: Record<NonNullable<typeof accent>, string> = {
    blue: "from-blue-600 to-sky-500 text-white shadow-blue-600/30",
    emerald: "from-emerald-500 to-teal-600 text-white shadow-emerald-600/30",
    purple: "from-violet-600 to-purple-500 text-white shadow-purple-600/30",
    amber: "from-amber-500 to-orange-500 text-white shadow-amber-600/30",
    sky: "from-sky-500 to-cyan-400 text-white shadow-sky-600/30",
    rose: "from-rose-500 to-pink-500 text-white shadow-rose-600/30",
  };

  const content = (
    <div
      className={cn(
        "group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-all duration-300",
        href && "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br shadow-lg transition-transform duration-300 group-hover:scale-110",
          accents[accent]
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tracking-tight text-slate-900">
          {value}
          {suffix && (
            <span className="ml-0.5 text-sm font-medium text-muted-foreground">{suffix}</span>
          )}
        </p>
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      {href && (
        <span
          className="absolute bottom-3 right-3 text-xs font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden="true"
        >
          Buka →
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}
