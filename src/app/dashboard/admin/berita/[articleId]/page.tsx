import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "../article-form";
import { updateArticle } from "@/app/actions/article-actions";

export const instant = false;

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  await requireRole("ADMIN");
  const { articleId } = await params;
  const article = await prisma.article.findFirst({
    where: { id: articleId, deletedAt: null },
    include: { imageFile: { select: { storedName: true } } },
  });
  if (!article) notFound();

  return (
    <div>
      <Link
        href="/dashboard/admin/berita"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar berita
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Edit Artikel — {article.title}</h1>
      <p className="mt-1 text-muted-foreground">
        Ubah judul, kategori, ringkasan, isi artikel, atau ganti gambar utama.
      </p>

      <div className="mt-6 max-w-2xl">
        <ArticleForm
          isEdit
          action={updateArticle.bind(null, article.id)}
          defaultValues={{
            title: article.title,
            summary: article.summary,
            content: article.content,
            category: article.category,
            authorName: article.authorName,
            imageUrl: article.imageUrl,
            imageEmbedded: article.imageEmbedded,
          }}
        />
      </div>
    </div>
  );
}