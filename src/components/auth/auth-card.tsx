import Link from "next/link";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";
import { AuthIllustration } from "@/components/auth/auth-illustration";

/**
 * Layout split-screen untuk halaman autentikasi (Login / Registrasi).
 * Tidak memakai navbar publik — halaman khusus auth sesuai permintaan revisi.
 */
export function AuthCard({
  title,
  subtitle,
  variant = "signin",
  children,
}: {
  title: string;
  subtitle: string;
  variant?: "signin" | "register";
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl shadow-blue-950/40 backdrop-blur-xl">
      <div className="grid lg:grid-cols-2">
        {/* Panel kiri: ilustrasi */}
        <div className="relative hidden overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-sky-600 lg:block">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 35%), radial-gradient(circle at 85% 80%, white 0, transparent 30%)" }} />
          <div className="relative flex h-full flex-col justify-between p-8">
            <Link href="/" className="inline-flex w-fit">
              <EdulalinLogo size="md" variant="light" />
            </Link>
            <div>
              <AuthIllustration variant={variant} />
              <h2 className="mt-2 text-2xl font-extrabold leading-snug text-white">
                {variant === "signin"
                  ? "Lanjutkan belajar aman di jalan."
                  : "Bergabung dan mulai edukasi keselamatan berlalu lintas."}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">
                Platform edukasi lalu lintas untuk murid SD, SMP, SMA/SMK, dan calon pengendara.
                Didukung kolaborasi sekolah, POLRI, dan Jasa Raharja.
              </p>
            </div>
          </div>
        </div>

        {/* Panel kanan: formulir */}
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/">
              <EdulalinLogo size="sm" variant="dark" />
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
