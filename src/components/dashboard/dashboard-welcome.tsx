import type { Role } from "@/generated/prisma/client";
import { RoleIllustration } from "@/components/dashboard/role-illustration";
import { getRoleLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Hero sambutan dashboard: menampilkan nama lengkap pengguna + animasi per role.
 * Dipakai konsisten di dashboard Admin, Guru, Murid, dan Polisi.
 */
export function DashboardWelcome({
  role,
  name,
  description,
  actions,
  accent,
}: {
  role: Role;
  name: string;
  description?: string;
  actions?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-800 via-blue-700 to-sky-600 text-white shadow-lg shadow-blue-900/10">
      {/* Dekorasi latar */}
      <div
        className="absolute inset-0 opacity-15"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, white 0, transparent 30%), radial-gradient(circle at 85% 12%, white 0, transparent 26%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-6 lg:p-8">
        <div className="min-w-0 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            {role === "MURID" ? "🎓" : role === "GURU" ? "👩‍🏫" : role === "POLISI" ? "🛡️" : "🖥️"}
            Dashboard {getRoleLabel(role)}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            Selamat Datang, {name}!
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-blue-100">
            {description ?? "Kelola aktivitas edukasi keselamatan berlalu lintas Anda di EDULALIN."}
          </p>
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
        <div className={cn("w-full max-w-xs sm:max-w-sm lg:w-80 lg:shrink-0", accent)}>
          <RoleIllustration role={role} className="h-auto w-full rounded-2xl shadow-xl shadow-blue-950/20" />
        </div>
      </div>
    </div>
  );
}
