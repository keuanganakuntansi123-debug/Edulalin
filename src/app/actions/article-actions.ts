"use server";

import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";
import { articleSchema } from "@/lib/validations";
import { fileUrl, removeStoredFile } from "@/lib/storage";
import type { EducationLevel } from "@/generated/prisma/client";

async function actorContext() {
  return requireRole("ADMIN");
}

function fireActivity(input: Parameters<typeof logActivity>[0]) {
  logActivity(input).catch(() => undefined);
}

/** Buat slug unik dari judul artikel. */
function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const suffix = Date.now().toString(36).slice(-6);
  return `${base || "artikel"}-${suffix}`;
}

/** Ambil data gambar artikel dari record UploadedFile. */
async function imageFromFileId(fileId: string | null) {
  if (!fileId) return null;
  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  return {
    imageFileId: file.id,
    imageUrl: fileUrl(file.storedName),
  };
}

export async function createArticle(formData: FormData) {
  const user = await actorContext();
  const imageFileId = formData.get("imageFileId") ? String(formData.get("imageFileId")) : null;
  const imageEmbedded = formData.get("imageEmbedded")
    ? String(formData.get("imageEmbedded"))
    : null;

  const parsed = articleSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    category: formData.get("category"),
    authorName: formData.get("authorName") || null,
  });
  if (!parsed.success) return { error: "Data tidak valid: lengkapi judul, ringkasan, kategori, dan isi artikel." };

  const image = await imageFromFileId(imageFileId);
  const article = await prisma.article.create({
    data: {
      ...parsed.data,
      slug: slugify(String(parsed.data.title)),
      imageFileId: image?.imageFileId ?? null,
      imageUrl: image?.imageUrl ?? null,
      imageEmbedded,
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  fireActivity({
    actorId: user.id,
    action: "ARTICLE_CREATE",
    entity: "ARTICLE",
    entityId: article.id,
    metadata: { title: article.title, category: article.category },
  });
  revalidatePath("/dashboard/admin/berita");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true, id: article.id };
}

export async function updateArticle(id: string, formData: FormData) {
  const user = await actorContext();
  const existing = await prisma.article.findFirst({
    where: { id, deletedAt: null },
    include: { imageFile: { select: { storedName: true } } },
  });
  if (!existing) return { error: "Artikel tidak ditemukan" };

  const imageFileId = formData.get("imageFileId") ? String(formData.get("imageFileId")) : null;
  const imageEmbedded = formData.get("imageEmbedded")
    ? String(formData.get("imageEmbedded"))
    : null;

  const parsed = articleSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    category: formData.get("category"),
    authorName: formData.get("authorName") || null,
  });
  if (!parsed.success) return { error: "Data tidak valid: lengkapi judul, ringkasan, kategori, dan isi artikel." };

  // Gambar: hanya ganti bila admin mengunggah file baru; jika tidak, pertahankan yang lama.
  let finalImageFileId = existing.imageFileId;
  let finalImageUrl = existing.imageUrl;
  let finalImageEmbedded = existing.imageEmbedded;
  let cleanupOldFileId: string | null = null;
  if (imageFileId && imageFileId !== existing.imageFileId) {
    const image = await imageFromFileId(imageFileId);
    if (image) {
      cleanupOldFileId = existing.imageFileId;
      finalImageFileId = image.imageFileId;
      finalImageUrl = image.imageUrl;
      finalImageEmbedded = imageEmbedded;
    }
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary,
      content: parsed.data.content,
      category: parsed.data.category,
      authorName: parsed.data.authorName,
      imageFileId: finalImageFileId,
      imageUrl: finalImageUrl,
      imageEmbedded: finalImageEmbedded,
      slug: existing.slug,
    },
  });

  // Bersihkan file lama jika diganti
  if (cleanupOldFileId) {
    const old = await prisma.uploadedFile.findUnique({ where: { id: cleanupOldFileId } });
    if (old) {
      await removeStoredFile(old.storedName);
      await prisma.uploadedFile.delete({ where: { id: old.id } });
    }
  }

  fireActivity({
    actorId: user.id,
    action: "ARTICLE_UPDATE",
    entity: "ARTICLE",
    entityId: article.id,
    metadata: { title: article.title, category: article.category },
  });
  revalidatePath("/dashboard/admin/berita");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleArticleStatus(id: string) {
  const user = await actorContext();
  const article = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!article) return { error: "Artikel tidak ditemukan" };
  const next = article.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.article.update({
    where: { id },
    data: { status: next },
  });
  fireActivity({
    actorId: user.id,
    action: "ARTICLE_STATUS",
    entity: "ARTICLE",
    entityId: id,
    metadata: { title: article.title, status: next },
  });
  revalidatePath("/dashboard/admin/berita");
  revalidatePath("/berita");
  return { ok: true };
}

export async function deleteArticle(id: string) {
  const user = await actorContext();
  const article = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!article) return { error: "Artikel tidak ditemukan" };

  await prisma.article.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  fireActivity({
    actorId: user.id,
    action: "ARTICLE_DELETE",
    entity: "ARTICLE",
    entityId: id,
    metadata: { title: article.title, category: article.category },
  });
  revalidatePath("/dashboard/admin/berita");
  revalidatePath("/berita");
  revalidatePath("/");
  return { ok: true };
}

export type ArticleCategory = EducationLevel;