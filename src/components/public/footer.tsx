import { CurrentYear } from "./current-year";
import { getSiteContentMap } from "@/lib/site-content";
import { EdulalinLogo } from "@/components/brand/edulalin-logo";
import { Mail, MapPin } from "lucide-react";
import Link from "next/link";

const CONTACT_EMAIL = "Keuanganakuntansi123@gmail.com";
const JASA_RAHARJA_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/5/52/LOGO_JASA_RAHARJA_2024_%28cropped%29.png";
const JASA_RAHARJA_ADDRESS =
  "Jl. Jatinegara Timur No.107, RT.1/RW.2, Bali Mester, Kecamatan Jatinegara, Kota Jakarta Timur, DKI Jakarta 13310";

export async function PublicFooter() {
  const content = await getSiteContentMap();
  const phone = content.get("CONTACT_PHONE")?.body?.trim() ?? "";
  const address = content.get("CONTACT_ADDRESS")?.body?.trim() ?? "";
  const social = content.get("CONTACT_SOCIAL")?.body?.trim() ?? "";

  const quickLinks = [
    { href: "/", label: "Beranda" },
    { href: "/program", label: "Program" },
    { href: "/berita", label: "Berita & Edukasi" },
    { href: "/tentang", label: "Tentang Kami" },
    { href: "/kontak", label: "Kontak" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-4">
        <div className="max-w-md">
          <EdulalinLogo size="md" variant="light" />
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            EDULALIN — Edukasi Lalu Lintas. Belajar Aman di Jalan. Platform edukasi
            keselamatan berlalu lintas untuk murid SD, SMP, SMA, dan calon pengendara.
          </p>
        </div>

        <div className="xl:justify-self-center">
          <h4 className="text-sm font-semibold text-white">Menu</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-sky-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Kontak</h4>
          <ul className="mt-3 space-y-3 text-sm text-slate-400">
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group flex items-start gap-2.5 wrap-break-word transition-colors hover:text-sky-400"
                aria-label={`Kirim email ke ${CONTACT_EMAIL}`}
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400 transition-colors group-hover:bg-sky-500/25">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium text-slate-300 group-hover:text-sky-300">
                  {CONTACT_EMAIL}
                </span>
              </a>
              <p className="mt-1 pl-8 text-xs text-slate-500">Contact Person EDULALIN</p>
            </li>
            {phone && <li className="flex items-start gap-2.5"><span className="mt-0.5">☎</span><span>{phone}</span></li>}
            {address && <li className="flex items-start gap-2.5 wrap-break-word"><span className="mt-0.5">📍</span><span>{address}</span></li>}
            {social && <li className="flex items-start gap-2.5 wrap-break-word"><span className="mt-0.5">🌐</span><span>{social}</span></li>}
          </ul>
        </div>

        <div className="max-w-sm">
          <h4 className="text-sm font-semibold text-white">Didukung oleh</h4>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={JASA_RAHARJA_LOGO}
              alt="Logo Jasa Raharja"
              className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="font-semibold text-white">Jasa Raharja</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Kantor Wilayah DKI Jakarta — Mitra Edukasi Keselamatan Berlalu Lintas.
              </p>
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-300">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span>{JASA_RAHARJA_ADDRESS}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        © <CurrentYear /> EDULALIN — Edukasi Lalu Lintas. Seluruh konten bersifat edukatif.
        {" "}Tagline: <span className="text-slate-400">&quot;Belajar Aman di Jalan&quot;</span>.
      </div>
    </footer>
  );
}