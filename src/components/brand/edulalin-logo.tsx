import { cn } from "@/lib/utils";

/**
 * Logo resmi EDULALIN — Edukasi Lalu Lintas.
 * Unsur visual: rambu/papan lalu lintas berbentuk perisai dengan jalan berkelok,
 * marka zebra cross, dan "stop" sebagai simbol keselamatan berkendara.
 * Dipakai konsisten di navbar, footer, halaman login/register, dan dashboard.
 */
export function EdulalinLogo({
  size = "md",
  variant = "light",
  showText = true,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  showText?: boolean;
  className?: string;
}) {
  const box = {
    sm: "h-9 w-9 rounded-lg",
    md: "h-11 w-11 rounded-xl",
    lg: "h-14 w-14 rounded-2xl",
    xl: "h-20 w-20 rounded-3xl",
  }[size];
  const icon = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-11 w-11",
  }[size];
  const title = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  }[size];
  const tagline = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-xs",
    xl: "text-sm",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20 ring-1 ring-white/20",
          box
        )}
      >
        {/* Simbol rambu lalu lintas (perisai) dengan jalan & zebra cross */}
        <svg viewBox="0 0 48 48" fill="none" className={icon} aria-hidden="true">
          <path
            d="M24 4l16 6v12c0 10-6.8 17.6-16 22C14.8 39.6 8 32 8 22V10l16-6z"
            fill="#fff"
            fillOpacity="0.16"
            stroke="#fff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 17h24M12 22h24" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M16 28l8-6 8 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="21" y="29" width="6" height="9" rx="1.5" fill="#fff" />
          <path d="M23.5 29v9M26.5 29v9" stroke="#1d4ed8" strokeWidth="1.1" strokeDasharray="2 1.6" strokeLinecap="round" />
          <circle cx="36.5" cy="38" r="2.4" fill="#fbbf24" />
        </svg>
        <span className="absolute inset-0 rounded-[inherit] bg-linear-to-t from-black/10 to-transparent" aria-hidden="true" />
      </span>
      {showText && (
        <span className="leading-tight">
          <span className={cn("block font-extrabold tracking-tight", title, variant === "dark" ? "text-slate-900" : "text-white")}>
            EDU<span className={variant === "dark" ? "text-primary" : "text-yellow-400"}>LALIN</span>
          </span>
          <span
            className={cn(
              "block font-semibold",
              tagline,
              variant === "dark" ? "text-muted-foreground" : "text-sky-200"
            )}
          >
            Edukasi Lalu Lintas
          </span>
        </span>
      )}
    </span>
  );
}
