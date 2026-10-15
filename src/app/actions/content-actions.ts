"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import type { ContentBlockKey } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

type JsonMeta = Prisma.InputJsonValue | undefined;

function asJson(v: unknown): JsonMeta {
  return v as Prisma.InputJsonValue;
}

const ALLOWED_KEYS = [
  "HERO_TITLE",
  "HERO_SUBTITLE",
  "ABOUT_TEXT",
  "CONTACT_ADDRESS",
  "CONTACT_EMAIL",
  "CONTACT_PHONE",
  "CONTACT_WHATSAPP",
  "CONTACT_SOCIAL",
  "FAQ",
] as const;

function fireActivity(input: Parameters<typeof logActivity>[0]) {
  logActivity(input).catch(() => undefined);
}

function revalidatePublic() {
  revalidatePath("/", "layout");
  revalidatePath("/program");
  revalidatePath("/modul");
  revalidatePath("/tentang");
  revalidatePath("/kontak");
  revalidatePath("/faq");
}

export async function saveSiteContent(formData: FormData) {
  const user = await requireRole("ADMIN");
  const key = String(formData.get("key") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!ALLOWED_KEYS.includes(key as (typeof ALLOWED_KEYS)[number])) {
    return { error: "Konten tidak dikenal" };
  }
  if (!title || !body) {
    return { error: "Judul dan isi wajib diisi" };
  }

  await prisma.siteContent.upsert({
    where: { key: key as never },
    update: { title, body },
    create: { key: key as never, title, body },
  });

  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "SITE_CONTENT_UPDATE",
    entity: "SITE_CONTENT",
    entityId: key,
    metadata: { key },
  });

  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   ContentBlock (beranda & tentang) — dengan sistem draft/terbit
   ===================================================================== */

const BLOCK_KEYS: ContentBlockKey[] = [
  "HERO_ANIMATION",
  "INTRO",
  "STATS_SETTINGS",
  "CTA",
  "ABOUT_PROFILE",
  "ABOUT_VISION",
  "ABOUT_MISSION",
  "ABOUT_GOALS",
  "ABOUT_PARTNERS",
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function saveContentBlock(formData: FormData) {
  const user = await requireRole("ADMIN");
  const key = String(formData.get("key") ?? "") as ContentBlockKey;
  if (!BLOCK_KEYS.includes(key)) return { error: "Blok konten tidak dikenal" };

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const animation = String(formData.get("animation") ?? "").trim();
  const enabledStats = formData.getAll("enabledStats").map(String);
  const publish = formData.get("publish") === "1";

  if (!title || !body) return { error: "Judul dan isi wajib diisi" };

  const meta: Record<string, unknown> = {};
  if (key === "HERO_ANIMATION" && (animation === "bicycle" || animation === "police")) {
    meta.animation = animation;
  }
  if (key === "STATS_SETTINGS" && enabledStats.length > 0) {
    meta.enabled = enabledStats;
  }

  const existing = await prisma.contentBlock.findUnique({ where: { key } });
  if (publish) {
    await prisma.contentBlock.upsert({
      where: { key },
      update: {
        title,
        subtitle,
        body,
        imageUrl,
        meta: asJson(Object.keys(meta).length ? meta : (existing?.meta ?? undefined)),
        published: true,
        publishedAt: new Date(),
        draftTitle: null,
        draftSubtitle: null,
        draftBody: null,
        draftImageUrl: null,
        draftMeta: undefined,
      },
      create: {
        key,
        title,
        subtitle,
        body,
        imageUrl,
        meta: asJson(Object.keys(meta).length ? meta : undefined),
        published: true,
        publishedAt: new Date(),
      },
    });
  } else {
    // Simpan sebagai draft tanpa menerbitkan
    await prisma.contentBlock.upsert({
      where: { key },
      update: {
        draftTitle: title,
        draftSubtitle: subtitle,
        draftBody: body,
        draftImageUrl: imageUrl,
        draftMeta: asJson(Object.keys(meta).length ? meta : (existing?.meta ?? undefined)),
      },
      create: {
        key,
        title,
        subtitle,
        body,
        imageUrl,
        meta: asJson(Object.keys(meta).length ? meta : undefined),
        published: false,
      },
    });
  }

  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "CONTENT_BLOCK_UPDATE",
    entity: "CONTENT_BLOCK",
    entityId: key,
    metadata: { key, publish },
  });

  revalidatePublic();
  return { ok: true };
}

export async function publishContentBlock(key: ContentBlockKey) {
  const user = await requireRole("ADMIN");
  const block = await prisma.contentBlock.findUnique({ where: { key } });
  if (!block) return { error: "Blok tidak ditemukan" };

  await prisma.contentBlock.update({
    where: { key },
    data: {
      title: block.draftTitle ?? block.title,
      subtitle: block.draftSubtitle ?? block.subtitle,
      body: block.draftBody ?? block.body,
      imageUrl: block.draftImageUrl ?? block.imageUrl,
      meta: asJson(block.draftMeta ?? block.meta),
      published: true,
      publishedAt: new Date(),
      draftTitle: null,
      draftSubtitle: null,
      draftBody: null,
      draftImageUrl: null,
      draftMeta: undefined,
    },
  });

  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "CONTENT_BLOCK_PUBLISH",
    entity: "CONTENT_BLOCK",
    entityId: key,
    metadata: { key },
  });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   Program
   ===================================================================== */

export async function saveProgram(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const objectives = String(formData.get("objectives") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim() || null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const order = Number(formData.get("order") ?? 0) || 0;
  const status = formData.get("status") === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  const moduleIds = formData.getAll("moduleIds").map(String).filter(Boolean);

  if (!title || !description) return { error: "Judul dan deskripsi wajib diisi" };

  let slug = slugify(String(formData.get("slug") ?? "")) || slugify(title);
  // Pastikan slug unik
  const existing = await prisma.program.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  if (id) {
    await prisma.program.update({
      where: { id },
      data: {
        title,
        slug,
        description,
        content: content || null,
        objectives: objectives || null,
        target,
        imageUrl,
        order,
        status,
        publishedAt: status === "ACTIVE" ? new Date() : undefined,
      },
    });
    await prisma.programModule.deleteMany({ where: { programId: id } });
    if (moduleIds.length > 0) {
      await prisma.programModule.createMany({
        data: moduleIds.map((moduleId) => ({ programId: id, moduleId })),
      });
    }
  } else {
    const created = await prisma.program.create({
      data: {
        title,
        slug,
        description,
        content: content || null,
        objectives: objectives || null,
        target,
        imageUrl,
        order,
        status,
        publishedAt: status === "ACTIVE" ? new Date() : null,
      },
    });
    if (moduleIds.length > 0) {
      await prisma.programModule.createMany({
        data: moduleIds.map((moduleId) => ({ programId: created.id, moduleId })),
      });
    }
  }

  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PROGRAM_UPDATE",
    entity: "PROGRAM",
    entityId: id || title,
    metadata: { title, status },
  });
  revalidatePublic();
  return { ok: true };
}

export async function toggleProgram(id: string) {
  const user = await requireRole("ADMIN");
  const p = await prisma.program.findUnique({ where: { id } });
  if (!p) return { error: "Program tidak ditemukan" };
  const next = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.program.update({
    where: { id },
    data: { status: next, publishedAt: next === "ACTIVE" ? new Date() : undefined },
  });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PROGRAM_TOGGLE",
    entity: "PROGRAM",
    entityId: id,
    metadata: { status: next },
  });
  revalidatePublic();
  return { ok: true };
}

export async function deleteProgram(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.program.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PROGRAM_DELETE",
    entity: "PROGRAM",
    entityId: id,
  });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   FAQ
   ===================================================================== */

export async function saveFaq(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "1";

  if (!question || !answer) return { error: "Pertanyaan dan jawaban wajib diisi" };

  if (id) {
    await prisma.faq.update({ where: { id }, data: { question, answer, order, active } });
  } else {
    await prisma.faq.create({ data: { question, answer, order, active } });
  }
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "FAQ_UPDATE",
    entity: "FAQ",
    entityId: id || question,
    metadata: { question },
  });
  revalidatePublic();
  return { ok: true };
}

export async function toggleFaq(id: string) {
  const user = await requireRole("ADMIN");
  const f = await prisma.faq.findUnique({ where: { id } });
  if (!f) return { error: "FAQ tidak ditemukan" };
  await prisma.faq.update({ where: { id }, data: { active: !f.active } });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "FAQ_TOGGLE",
    entity: "FAQ",
    entityId: id,
  });
  revalidatePublic();
  return { ok: true };
}

export async function deleteFaq(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.faq.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "FAQ_DELETE",
    entity: "FAQ",
    entityId: id,
  });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   SiteFeature (Keunggulan Beranda)
   ===================================================================== */

export async function saveFeature(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "1";

  if (!title || !description) return { error: "Judul dan deskripsi wajib diisi" };

  if (id) {
    await prisma.siteFeature.update({ where: { id }, data: { title, description, emoji, order, active } });
  } else {
    await prisma.siteFeature.create({ data: { title, description, emoji, order, active } });
  }
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "FEATURE_UPDATE",
    entity: "FEATURE",
    entityId: id || title,
  });
  revalidatePublic();
  return { ok: true };
}

export async function deleteFeature(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.siteFeature.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "FEATURE_DELETE",
    entity: "FEATURE",
    entityId: id,
  });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   MissionItem & GoalItem (Tentang)
   ===================================================================== */

export async function saveMissionItem(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "1";
  if (!text) return { error: "Isi misi wajib diisi" };
  if (id) {
    await prisma.missionItem.update({ where: { id }, data: { text, order, active } });
  } else {
    await prisma.missionItem.create({ data: { text, order, active } });
  }
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "MISSION_UPDATE", entity: "MISSION", entityId: id || text });
  revalidatePublic();
  return { ok: true };
}

export async function deleteMissionItem(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.missionItem.delete({ where: { id } });
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "MISSION_DELETE", entity: "MISSION", entityId: id });
  revalidatePublic();
  return { ok: true };
}

export async function saveGoalItem(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "1";
  if (!text) return { error: "Isi tujuan wajib diisi" };
  if (id) {
    await prisma.goalItem.update({ where: { id }, data: { text, order, active } });
  } else {
    await prisma.goalItem.create({ data: { text, order, active } });
  }
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "GOAL_UPDATE", entity: "GOAL", entityId: id || text });
  revalidatePublic();
  return { ok: true };
}

export async function deleteGoalItem(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.goalItem.delete({ where: { id } });
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "GOAL_DELETE", entity: "GOAL", entityId: id });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   CollaborationPartner (Kolaborasi Edukasi)
   ===================================================================== */

const PARTNER_ROLES = ["SCHOOL", "POLRI", "JASA_RAHARJA", "OTHER"] as const;

export async function saveCollaborationPartner(formData: FormData) {
  const user = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as (typeof PARTNER_ROLES)[number];
  const roleLabel = String(formData.get("roleLabel") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const order = Number(formData.get("order") ?? 0) || 0;
  const active = formData.get("active") === "1";

  if (!name) return { error: "Nama mitra wajib diisi" };
  if (!PARTNER_ROLES.includes(role)) return { error: "Kategori mitra tidak valid" };

  const slug =
    id === ""
      ? `${role.toLowerCase()}-${Date.now().toString(36)}`
      : (await prisma.collaborationPartner.findUnique({ where: { id } }))?.slug ?? `${role.toLowerCase()}-${Date.now().toString(36)}`;

  if (id) {
    await prisma.collaborationPartner.update({
      where: { id },
      data: { name, role, roleLabel, description, logoUrl, order, active },
    });
  } else {
    const nextOrder =
      order > 0
        ? order
        : (await prisma.collaborationPartner.aggregate({ _max: { order: true } }))._max.order ?? -1;
    await prisma.collaborationPartner.create({
      data: { name, slug, role, roleLabel, description, logoUrl, order: nextOrder + 1, active },
    });
  }
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PARTNER_UPDATE",
    entity: "COLLABORATION_PARTNER",
    entityId: id || slug,
    metadata: { name, role },
  });
  revalidatePublic();
  return { ok: true };
}

export async function deleteCollaborationPartner(id: string) {
  const user = await requireRole("ADMIN");
  const p = await prisma.collaborationPartner.findUnique({ where: { id } });
  if (!p) return { error: "Mitra tidak ditemukan" };
  await prisma.collaborationPartner.delete({ where: { id } });
  fireActivity({
    actorId: user.id,
    schoolId: user.schoolId,
    action: "PARTNER_DELETE",
    entity: "COLLABORATION_PARTNER",
    entityId: id,
    metadata: { name: p.name },
  });
  revalidatePublic();
  return { ok: true };
}

/* =====================================================================
   ContactMessage
   ===================================================================== */

export async function updateContactMessageStatus(id: string, status: "NEW" | "READ" | "DONE") {
  const user = await requireRole("ADMIN");
  if (!["NEW", "READ", "DONE"].includes(status)) return { error: "Status tidak valid" };
  await prisma.contactMessage.update({
    where: { id },
    data: { status, readAt: status === "READ" || status === "DONE" ? new Date() : null },
  });
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "CONTACT_STATUS", entity: "CONTACT_MESSAGE", entityId: id, metadata: { status } });
  revalidatePublic();
  return { ok: true };
}

export async function deleteContactMessage(id: string) {
  const user = await requireRole("ADMIN");
  await prisma.contactMessage.delete({ where: { id } });
  fireActivity({ actorId: user.id, schoolId: user.schoolId, action: "CONTACT_DELETE", entity: "CONTACT_MESSAGE", entityId: id });
  revalidatePublic();
  return { ok: true };
}