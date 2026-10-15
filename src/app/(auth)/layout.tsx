import { CurrentYear } from "@/components/public/current-year";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
      {/* Dekorasi latar bertema lalu lintas */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, #1d4ed8 0, transparent 30%), radial-gradient(circle at 88% 12%, #0ea5e9 0, transparent 32%), radial-gradient(circle at 78% 88%, #1e40af 0, transparent 34%), radial-gradient(circle at 15% 82%, #0284c7 0, transparent 30%)",
          }}
        />
        {/* Zebra cross */}
        <div className="absolute bottom-0 left-0 right-0 flex h-10 gap-3 opacity-20">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="w-10 rotate-2 bg-white" />
          ))}
        </div>
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © <CurrentYear /> EDULALIN — Edukasi Lalu Lintas. Belajar Aman di Jalan.
      </footer>
    </div>
  );
}
