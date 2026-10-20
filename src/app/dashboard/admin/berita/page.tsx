import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { levelDisplayLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "./article-form";
import {
  createArticle,
  toggleArticleStatus,
  deleteArticle,
} from "@/app/actions/article-actions";
import { fileUrl } from "@/lib/storage";
import Link from "next/link";
import { Newspaper, Pencil, Eye } from "lucide-react";
import { DeleteArticleButton } from "./delete-article-button";

export const instant = false;

const CATEGORIES = [
  { value: "SD", label: "SD", emoji: "🧒" },
  { value: "SMP", label: "SMP", emoji: "🧑" },
  { value: "SMA", label: "SMA", emoji: "🧑‍🎓" },
  { value: "SMK", label: "SMK", emoji: "👷" },
  { value: "SIM", label: "SIM", emoji: "🪪" },
];

async function toggleAction(id: string) {
  "use server";
  await toggleArticleStatus(id);
}

async function deleteAction(id: string) {
  "use server";
  await deleteArticle(id);
}

export default async function AdminBeritaPage() {
  await requireRole("ADMIN");

  const articles = await prisma.article.findMany({
    where: { deletedAt: null },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }],
    include: { imageFile: { select: { storedName: true } } },
  });

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    articles: articles.filter((a) => a.category === c.value),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Berita &amp; Edukasi</h1>
          <p className="text-muted-foreground">
            Tambahkan, ubah, atau hapus artikel edukasi lalu lintas yang tampil di halaman publik.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Daftar berita */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {byCategory.map(({ value, label, articles: list }) => (
              <details key={value} className="w-full" open={list.length > 0}>
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary/50">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{label === "SIM" ? "🪪" : label === "SD" ? "🧒" : label === "SMP" ? "🧑" : label === "SMA" ? "🧑‍🎓" : "👷"}</span>
                    Kategori {label}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {list.length}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">klik untuk buka/tutup</span>
                </summary>
                <div className="mt-3 space-y-3">
                  {list.map((a) => {
                    const image = a.imageEmbedded ?? (a.imageFile ? fileUrl(a.imageFile.storedName) : a.imageUrl);
                    return (
                      <Card key={a.id}>
                        <CardContent className="pt-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt=""
                                  className="h-16 w-24 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                  <Newspaper className="h-6 w-6" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">{a.title}</h3>
                                  {a.status === "ACTIVE" ? (
                                    <Badge variant="success">Aktif</Badge>
                                  ) : (
                                    <Badge variant="secondary">Nonaktif</Badge>
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.summary}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {levelDisplayLabel(a.category)}
                                  {a.authorName ? ` • ${a.authorName}` : ""}
                                  {" • "}
                                  {a.publishedAt
                                    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(a.publishedAt))
                                    : "Belum terbit"}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Link href={`/berita/${a.slug}`} target="_blank">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3.5 w-3.5" /> Lihat
                                </Button>
                              </Link>
                              <Link href={`/dashboard/admin/berita/${a.id}`}>
                                <Button size="sm" variant="outline">
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                              </Link>
                              <form action={toggleAction.bind(null, a.id)}>
                                <Button size="sm" variant={a.status === "ACTIVE" ? "secondary" : "default"}>
                                  {a.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                                </Button>
                              </form>
                              <DeleteArticleButton articleId={a.id} onDelete={deleteAction} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                      Belum ada artikel di kategori {label}. Gunakan form di samping untuk menerbitkan.
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Form tambah */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                Tulis Berita Baru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ArticleForm action={createArticle} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}