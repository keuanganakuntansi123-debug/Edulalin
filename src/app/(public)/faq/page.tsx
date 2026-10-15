import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { FaqAccordion } from "./faq-accordion";
import { PageHero } from "@/components/public/page-hero";

export const metadata: Metadata = {
  title: "FAQ | EDULALIN | Edukasi Lalu Lintas",
  description: "Pertanyaan yang sering diajukan seputar pembelajaran dan penggunaan platform EDULALIN.",
};
export const instant = false;

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Pusat Bantuan"
        badgeEmoji="💬"
        title="Pertanyaan yang Sering Diajukan"
        description="Temukan jawaban atas pertanyaan umum seputar pembelajaran dan penggunaan platform EDULALIN."
      />

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="container-page max-w-3xl">
          <FaqAccordion faqs={faqs} />
        </div>
      </section>
    </div>
  );
}
