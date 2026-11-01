"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { ActionForm } from "@/components/ui/action-form";
import { ArticleForm } from "@/app/dashboard/admin/berita/article-form";
import {
  createArticle,
  toggleArticleStatus,
  deleteArticle,
} from "@/app/actions/article-actions";
import { Newspaper, Pencil, Eye, Trash2 } from "lucide-react";
import { levelDisplayLabel } from "@/lib/constants";

export type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  status: "ACTIVE" | "INACTIVE";
  authorName: string | null;
  publishedAt: string | null;
  image: string | null;
};

const CATEGORIES = [
  { value: "SD", label: "SD", icon: "/kategori-sd.svg" },
  { value: "SMP", label: "SMP", icon: "/kategori-smp.svg" },
  { value: "SMA", label: "SMA", icon: "/kategori-sma.svg" },
  { value: "SMK", label: "SMK", icon: "/kategori-smk.svg" },
  { value: "SIM", label: "SIM", icon: "/kategori-sim.svg" },
];

/** Tombol hapus artikel dengan konfirmasi (client). */
function DeleteArticleButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm("Hapus artikel ini? Tindakan tidak dapat dibatalkan.")) return;
    startTransition(async () => {
      try {
        const res = (await deleteArticle(id)) as { ok?: boolean; error?: string } | void;
        if (res && "error" in res && res.error) {
          toast({ title: "Gagal", description: String(res.error), variant: "error" });
          return;
        }
        toast({ title: "Artikel berhasil dihapus", variant: "success" });
        router.refresh();
      } catch (error) {
        toast({
          title: "Gagal",
          description: error instanceof Error ? error.message : "Tidak dapat menghapus artikel.",
          variant: "error",
        });
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onDelete}
      disabled={pending}
      className="text-red-600 hover:bg-red-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> Hapus
    </Button>
  );
}

/**
 * Kelola Berita & Edukasi — diintegrasikan ke dalam Kelola Konten Website.
 * Menyediakan tambah, edit, hapus, ganti gambar, kategori, dan publikasi
 * (aktif/nonaktif) artikel. Data dari halaman server (Neon) + aksi server.
 */
export function ArticlesTab({ articles }: { articles: AdminArticle[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const visible =
    categoryFilter === "ALL"
      ? articles
      : articles.filter((a) => a.category === categoryFilter);

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    articles: visible.filter((a) => a.category === c.value),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Newspaper className="h-4 w-4" /> Berita &amp; Edukasi
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola artikel edukasi lalu lintas yang tampil di halaman publik. Semua artikel dapat
          ditambah, diubah, dihapus, diganti gambarnya, dan diterbitkan/nonaktifkan dari sini.
        </p>
      </div>

      {/* Filter kategori */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("ALL")}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            categoryFilter === "ALL"
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-slate-600 hover:border-primary/40"
          }`}
        >
          Semua ({articles.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = articles.filter((a) => a.category === c.value).length;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategoryFilter(c.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                categoryFilter === c.value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-slate-600 hover:border-primary/40"
              }`}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daftar berita */}
        <div className="space-y-4 lg:col-span-2">
          {byCategory.map(({ value, label, icon, articles: list }) => {
            if (categoryFilter !== "ALL" && categoryFilter !== value) return null;
            return (
              <details key={value} className="w-full" open={list.length > 0}>
                <summary className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary/50">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={icon} alt="" className="h-6 w-6" />
                    </span>
                    Kategori {label}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {list.length}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">klik untuk buka/tutup</span>
                </summary>
                <div className="mt-3 space-y-3">
                  {list.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="pt-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            {a.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={a.image}
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
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {a.summary}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {levelDisplayLabel(a.category)}
                                {a.authorName ? ` • ${a.authorName}` : ""}
                                {" • "}
                                {a.publishedAt
                                  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                                      new Date(a.publishedAt)
                                    )
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
                            <ActionForm
                              action={() => toggleArticleStatus(a.id)}
                              successMessage={
                                a.status === "ACTIVE"
                                  ? "Artikel berhasil dinonaktifkan"
                                  : "Artikel berhasil diaktifkan"
                              }
                            >
                              <Button
                                size="sm"
                                variant={a.status === "ACTIVE" ? "secondary" : "default"}
                              >
                                {a.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                            </ActionForm>
                            <DeleteArticleButton id={a.id} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {list.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                      Belum ada artikel di kategori {label}. Gunakan form di samping untuk
                      menerbitkan.
                    </div>
                  )}
                </div>
              </details>
            );
          })}
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
