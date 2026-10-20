"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/program", label: "Program" },
  { href: "/modul", label: "Modul" },
  { href: "/berita", label: "Berita & Edukasi" },
  { href: "/tentang", label: "Tentang Kami" },
  { href: "/kontak", label: "Kontak" },
  { href: "/faq", label: "FAQ" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Tutup drawer saat pindah halaman (set state during render — pola resmi React)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-slate-200/70 bg-white/90 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.12)] backdrop-blur-xl"
          : "border-b border-transparent bg-white/70 backdrop-blur-xl"
      )}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <EdulalinLogo size="md" variant="dark" showText={false} />
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-slate-900">
              EDU<span className="text-primary">LALIN</span>
            </span>
            <span className="block text-[11px] font-medium text-slate-500">Belajar Aman di Jalan</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 p-1 text-sm font-medium text-slate-600 shadow-sm backdrop-blur lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-2 transition-all duration-300",
                  active
                    ? "bg-primary font-semibold text-white shadow-sm shadow-blue-600/30"
                    : "hover:bg-blue-50 hover:text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 xl:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Edukasi Keselamatan
          </span>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-blue-50 hover:text-primary">Login</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-linear-to-r from-blue-700 to-sky-600 text-white shadow-md shadow-blue-600/25 hover:from-blue-800 hover:to-sky-700">
              Daftar
            </Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-slate-200/70 bg-white/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out lg:hidden",
          open ? "max-h-[520px] border-t opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="container-page flex flex-col gap-1 py-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary font-semibold text-white shadow-sm shadow-blue-600/25"
                    : "text-slate-600 hover:bg-blue-50 hover:text-primary"
                )}
              >
                {item.label}
                {active && (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </Link>
            );
          })}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-4">
            <Link href="/login">
              <Button variant="outline" className="w-full text-slate-700">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="w-full bg-linear-to-r from-blue-700 to-sky-600 text-white">Daftar</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}