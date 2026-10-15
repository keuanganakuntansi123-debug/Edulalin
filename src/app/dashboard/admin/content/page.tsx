import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { DEFAULTS } from "@/lib/site-content";
import { ContentCms } from "./content-cms";

export const instant = false;

export default async function AdminContentCmsPage() {
  await requireRole("ADMIN");

  const [
    blocks,
    programs,
    faqs,
    features,
    missions,
    goals,
    partners,
    messages,
    modules,
    siteContent,
  ] = await Promise.all([
    prisma.contentBlock.findMany({ orderBy: { order: "asc" } }),
    prisma.program.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { programModules: true } },
        programModules: { select: { moduleId: true } },
      },
    }),
    prisma.faq.findMany({ orderBy: { order: "asc" } }),
    prisma.siteFeature.findMany({ orderBy: { order: "asc" } }),
    prisma.missionItem.findMany({ orderBy: { order: "asc" } }),
    prisma.goalItem.findMany({ orderBy: { order: "asc" } }),
    prisma.collaborationPartner.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.module.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [{ educationLevel: "asc" }, { order: "asc" }],
      select: { id: true, title: true, educationLevel: true },
    }),
    prisma.siteContent.findMany(),
  ]);

  const siteContentMap = new Map(siteContent.map((r) => [r.key, r]));
  const contactDefaults = {
    email: siteContentMap.get("CONTACT_EMAIL")?.body ?? "",
    whatsapp: siteContentMap.get("CONTACT_WHATSAPP")?.body ?? "",
    phone: siteContentMap.get("CONTACT_PHONE")?.body ?? "",
    address: siteContentMap.get("CONTACT_ADDRESS")?.body ?? "",
    social: siteContentMap.get("CONTACT_SOCIAL")?.body ?? "",
  };

  return (
    <ContentCms
      blocks={blocks}
      programs={programs}
      faqs={faqs}
      features={features}
      missions={missions}
      goals={goals}
      partners={partners}
      messages={messages}
      modules={modules}
      contactDefaults={contactDefaults}
      defaultHeroTitle={DEFAULTS.HERO_TITLE.body}
      defaultHeroDesc={DEFAULTS.HERO_SUBTITLE.body}
    />
  );
}