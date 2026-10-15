"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { FileUpload } from "@/components/upload/file-upload";
import { cn } from "@/lib/utils";
import { levelDisplayLabel } from "@/lib/constants";
import {
  saveContentBlock,
  saveProgram,
  toggleProgram,
  deleteProgram,
  saveFaq,
  toggleFaq,
  deleteFaq,
  saveFeature,
  deleteFeature,
  saveMissionItem,
  deleteMissionItem,
  saveGoalItem,
  deleteGoalItem,
  updateContactMessageStatus,
  deleteContactMessage,
  saveSiteContent,
  saveCollaborationPartner,
  deleteCollaborationPartner,
} from "@/app/actions/content-actions";
import {
  Home,
  LayoutGrid,
  BookOpen,
  Info,
  Mail,
  MessageCircleQuestion,
  Handshake,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  CheckCircle2,
  Link2,
  RotateCcw,
} from "lucide-react";

type Block = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  body: string;
  imageUrl: string | null;
  meta: unknown;
  order: number;
  published: boolean;
  draftTitle: string | null;
  draftSubtitle: string | null;
  draftBody: string | null;
  draftImageUrl: string | null;
  draftMeta: unknown;
};

type Program = {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  target: string | null;
  objectives: string | null;
  content: string | null;
  order: number;
  status: "ACTIVE" | "INACTIVE";
  _count: { programModules: number };
  programModules: { moduleId: string }[];
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
};

type Feature = {
  id: string;
  title: string;
  description: string;
  emoji: string | null;
  order: number;
  active: boolean;
};

type Mission = { id: string; text: string; order: number; active: boolean };
type Goal = { id: string; text: string; order: number; active: boolean };

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "DONE";
  createdAt: Date;
};

type ModuleLite = { id: string; title: string; educationLevel: string };

type Partner = {
  id: string;
  name: string;
  slug: string;
  role: string;
  roleLabel: string | null;
  description: string | null;
  logoUrl: string | null;
  order: number;
  active: boolean;
};

const TABS = [
  { id: "beranda", label: "Kelola Beranda", icon: Home },
  { id: "program", label: "Kelola Program", icon: LayoutGrid },
  { id: "modul", label: "Kelola Modul", icon: BookOpen },
  { id: "tentang", label: "Kelola Tentang Kami", icon: Info },
  { id: "kolaborasi", label: "Kolaborasi Edukasi", icon: Handshake },
  { id: "kontak", label: "Kelola Kontak", icon: Mail },
  { id: "faq", label: "Kelola FAQ", icon: MessageCircleQuestion },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BLOCK_LABEL: Record<string, string> = {
  HERO_ANIMATION: "Animasi Hero",
  INTRO: "Apa Itu EDULALIN?",
  STATS_SETTINGS: "Statistik Platform",
  CTA: "Ajakan Belajar",
  ABOUT_PROFILE: "Profil Platform",
  ABOUT_VISION: "Visi",
  ABOUT_MISSION: "Misi",
  ABOUT_GOALS: "Tujuan",
  ABOUT_PARTNERS: "Kolaborasi",
};

const BLOCK_DESC: Record<string, string> = {
  HERO_ANIMATION: "Pilih animasi utama di bagian hero Beranda (anak bersepeda atau polisi membantu menyeberang).",
  INTRO: "Bagian pengenalan singkat EDULALIN di halaman Beranda.",
  STATS_SETTINGS: "Pilih statistik yang ingin ditampilkan di Beranda.",
  CTA: "Bagian ajakan belajar di akhir halaman Beranda.",
  ABOUT_PROFILE: "Deskripsi pengenalan platform di halaman Tentang Kami.",
  ABOUT_VISION: "Visi EDULALIN.",
  ABOUT_MISSION: "Misi EDULALIN.",
  ABOUT_GOALS: "Tujuan EDULALIN.",
  ABOUT_PARTNERS: "Bagian kolaborasi edukasi.",
};

function confirmDelete(message: string): boolean {
  return window.confirm(message);
}

export function ContentCms({
  blocks,
  programs,
  faqs,
  features,
  missions,
  goals,
  partners,
  messages,
  modules,
  contactDefaults,
  defaultHeroTitle,
  defaultHeroDesc,
}: {
  blocks: Block[];
  programs: Program[];
  faqs: Faq[];
  features: Feature[];
  missions: Mission[];
  goals: Goal[];
  partners: Partner[];
  messages: Message[];
  modules: ModuleLite[];
  contactDefaults: { email: string; whatsapp: string; phone: string; address: string; social: string };
  defaultHeroTitle: string;
  defaultHeroDesc: string;
}) {
  const [tab, setTab] = useState<TabId>("beranda");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kelola Konten Website</h1>
          <p className="text-muted-foreground">
            Kelola seluruh konten publik EDULALIN dalam satu menu. Perubahan baru terlihat
            setelah konten diterbitkan.
          </p>
        </div>
      </div>

      {/* Tab navigasi */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "beranda" && (
          <BerandaTab
            blocks={blocks}
            features={features}
            defaultHeroTitle={defaultHeroTitle}
            defaultHeroDesc={defaultHeroDesc}
          />
        )}
        {tab === "program" && <ProgramTab programs={programs} modules={modules} />}
        {tab === "modul" && <ModulTab />}
        {tab === "tentang" && (
          <TentangTab blocks={blocks} missions={missions} goals={goals} />
        )}
        {tab === "kolaborasi" && <KolaborasiTab partners={partners} />}
        {tab === "kontak" && <KontakTab contactDefaults={contactDefaults} messages={messages} />}
        {tab === "faq" && <FaqTab faqs={faqs} />}
      </div>
    </div>
  );
}

/* =====================================================================
   Tab Beranda
   ===================================================================== */

function BerandaTab({
  blocks,
  features,
  defaultHeroTitle,
  defaultHeroDesc,
}: {
  blocks: Block[];
  features: Feature[];
  defaultHeroTitle: string;
  defaultHeroDesc: string;
}) {
  const heroAnim = blocks.find((b) => b.key === "HERO_ANIMATION");
  const intro = blocks.find((b) => b.key === "INTRO");
  const statsSettings = blocks.find((b) => b.key === "STATS_SETTINGS");
  const cta = blocks.find((b) => b.key === "CTA");

  const [animChoice, setAnimChoice] = useState(
    (heroAnim?.meta as Record<string, unknown> | null)?.animation === "police" ? "police" : "bicycle"
  );
  const [enabledStats, setEnabledStats] = useState<string[]>(
    Array.isArray((statsSettings?.meta as Record<string, unknown> | null)?.enabled)
      ? ((statsSettings?.meta as Record<string, unknown>).enabled as string[])
      : ["schools", "murids", "modules", "quizzes"]
  );

  const toggleStat = (key: string) =>
    setEnabledStats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Beranda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BlockForm
            blockKey="INTRO"
            label="Headline & Deskripsi Hero"
            hint="Judul besar dan deskripsi di bagian atas halaman Beranda."
            defaultTitle={defaultHeroTitle}
            defaultBody={defaultHeroDesc}
          />
          <div className="rounded-xl border border-border bg-slate-50 p-4">
            <Label>Pilihan Animasi Hero</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Pilih animasi edukasi lalu lintas yang tampil di hero Beranda.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: "bicycle", label: "🚲 Anak Bersepeda", desc: "Anak memakai helm mengayuh sepeda di lingkungan jalan aman." },
                { value: "police", label: "👮 Polisi Membantu Menyeberang", desc: "Polisi membantu anak sekolah menyeberang di zebra cross." },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex-1 cursor-pointer rounded-xl border p-4 transition-colors",
                    animChoice === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-white hover:border-primary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="hero-animation"
                    value={opt.value}
                    checked={animChoice === opt.value}
                    onChange={() => setAnimChoice(opt.value)}
                    className="sr-only"
                  />
                  <p className="font-semibold">{opt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  const fd = new FormData();
                  fd.set("key", "HERO_ANIMATION");
                  fd.set("title", "Animasi Hero");
                  fd.set("body", animChoice);
                  fd.set("animation", animChoice);
                  fd.set("publish", "1");
                  const res = await saveContentBlock(fd);
                  if (res?.ok) toast({ title: "Animasi disimpan", variant: "success" });
                  else toast({ title: "Gagal", description: res?.error, variant: "error" });
                }}
              >
                <Save className="h-4 w-4" />
                Simpan Pilihan Animasi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intro */}
      {intro && (
        <BlockCard
          block={intro}
          label={BLOCK_LABEL[intro.key] ?? intro.key}
          desc="Bagian pengenalan singkat EDULALIN di Beranda."
        />
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik Platform</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pilih statistik yang tampil di Beranda. Angka diambil langsung dari database.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "schools", label: "Sekolah Terdaftar" },
              { key: "murids", label: "Murid Terdaftar" },
              { key: "modules", label: "Modul Tersedia" },
              { key: "quizzes", label: "Kuis Pembelajaran" },
            ].map((s) => (
              <label
                key={s.key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  enabledStats.includes(s.key)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white text-slate-600"
                )}
              >
                <input
                  type="checkbox"
                  checked={enabledStats.includes(s.key)}
                  onChange={() => toggleStat(s.key)}
                  className="h-4 w-4 accent-primary"
                />
                {s.label}
              </label>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-4"
            onClick={async () => {
              const fd = new FormData();
              fd.set("key", "STATS_SETTINGS");
              fd.set("title", "Statistik Platform");
              fd.set("body", enabledStats.join(","));
              enabledStats.forEach((k) => fd.append("enabledStats", k));
              fd.set("publish", "1");
              const res = await saveContentBlock(fd);
              if (res?.ok) toast({ title: "Statistik disimpan", variant: "success" });
              else toast({ title: "Gagal", description: res?.error, variant: "error" });
            }}
          >
            <Save className="h-4 w-4" />
            Simpan Pengaturan Statistik
          </Button>
        </CardContent>
      </Card>

      {/* CTA */}
      {cta && (
        <BlockCard
          block={cta}
          label={BLOCK_LABEL[cta.key] ?? cta.key}
          desc="Judul, deskripsi, dan teks tombol ajakan belajar di akhir Beranda."
        />
      )}

      {/* Keunggulan */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Keunggulan EDULALIN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FeatureForm />
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada card keunggulan.</p>
          ) : (
            features.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{f.emoji ?? "📘"}</span>
                    <p className="truncate font-semibold">{f.title}</p>
                    {!f.active && <Badge variant="secondary">Nonaktif</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{f.description}</p>
                </div>
                <FeatureEditForm feature={f} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BlockForm({
  blockKey,
  label,
  hint,
  defaultTitle,
  defaultBody,
  block,
}: {
  blockKey: string;
  label: string;
  hint?: string;
  defaultTitle?: string;
  defaultBody?: string;
  block?: Block;
}) {
  const [title, setTitle] = useState(block?.title ?? defaultTitle ?? "");
  const [body, setBody] = useState(block?.body ?? defaultBody ?? "");

  const submit = async (publish: boolean) => {
    const fd = new FormData();
    fd.set("key", blockKey);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("subtitle", "");
    fd.set("imageUrl", "");
    fd.set("publish", publish ? "1" : "0");
    const res = await saveContentBlock(fd);
    if (res?.ok) {
      toast({
        title: publish ? "Konten diterbitkan" : "Draft disimpan",
        description: publish
          ? "Perubahan kini terlihat di halaman publik."
          : "Perubahan disimpan sebagai draft, belum tampil di publik.",
        variant: "success",
      });
    } else {
      toast({ title: "Gagal", description: res?.error ?? "Terjadi kesalahan.", variant: "error" });
    }
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="grid gap-2">
        <Label htmlFor={`title-${blockKey}`}>Judul</Label>
        <Input id={`title-${blockKey}`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`body-${blockKey}`}>Isi</Label>
        <Textarea id={`body-${blockKey}`} value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => submit(true)}>
          <Save className="h-4 w-4" />
          Simpan & Terbitkan
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => submit(false)}>
          Simpan Draft
        </Button>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  label,
  desc,
}: {
  block: Block;
  label: string;
  desc: string;
}) {
  const published = block.published;
  const hasDraft = Boolean(
    block.draftTitle !== null ||
      block.draftBody !== null ||
      block.draftSubtitle !== null ||
      block.draftImageUrl !== null
  );
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);

  const effectiveTitle = block.draftTitle ?? block.title;
  const effectiveBody = block.draftBody ?? block.body;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>{label}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {published ? (
            <Badge variant="success">Terbit</Badge>
          ) : (
            <Badge variant="warning">Draft</Badge>
          )}
          {hasDraft && !editing && <Badge variant="secondary">Ada draft</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {preview ? (
          <div className="rounded-xl border border-border bg-slate-50 p-5">
            <h3 className="text-lg font-bold">{effectiveTitle}</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{effectiveBody}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPreview(false)}>
                <Eye className="h-4 w-4" />
                Tutup Pratinjau
              </Button>
            </div>
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <BlockForm blockKey={block.key} block={block} label="Edit konten" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Batal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreview(true)}>
                <Eye className="h-4 w-4" />
                Pratinjau
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold">{block.title}</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{block.body}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreview(true)}>
                <Eye className="h-4 w-4" />
                Pratinjau
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");

  const submit = async () => {
    if (!title || !description) {
      toast({ title: "Judul dan deskripsi wajib diisi", variant: "error" });
      return;
    }
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("emoji", emoji);
    fd.set("order", String(Date.now()));
    fd.set("active", "1");
    const res = await saveFeature(fd);
    if (res?.ok) {
      toast({ title: "Card keunggulan ditambahkan", variant: "success" });
      setTitle("");
      setDescription("");
      setEmoji("");
    } else toast({ title: "Gagal", description: res?.error, variant: "error" });
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Tambah Card Keunggulan</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input placeholder="Judul (mis. Materi Edukatif)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Emoji (mis. 📚)" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        <Input placeholder="Deskripsi singkat" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <Button size="sm" className="mt-3" onClick={submit}>
        <Plus className="h-4 w-4" />
        Tambah Card
      </Button>
    </div>
  );
}

function FeatureEditForm({ feature }: { feature: Feature }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(feature.title);
  const [description, setDescription] = useState(feature.description);
  const [emoji, setEmoji] = useState(feature.emoji ?? "");

  if (!editing) {
    return (
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={async () => {
            if (!confirmDelete("Hapus card keunggulan ini?")) return;
            const res = await deleteFeature(feature.id);
            if (res?.ok) toast({ title: "Card dihapus", variant: "success" });
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="w-48" />
      <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16" />
      <Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-64" />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            const fd = new FormData();
            fd.set("id", feature.id);
            fd.set("title", title);
            fd.set("description", description);
            fd.set("emoji", emoji);
            fd.set("order", String(feature.order));
            fd.set("active", feature.active ? "1" : "0");
            const res = await saveFeature(fd);
            if (res?.ok) {
              toast({ title: "Card diperbarui", variant: "success" });
              setEditing(false);
            }
          }}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}

/* =====================================================================
   Tab Program
   ===================================================================== */

function ProgramTab({
  programs,
  modules,
}: {
  programs: Program[];
  modules: ModuleLite[];
}) {
  const [editing, setEditing] = useState<Program | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setCreating(true); setEditing(null); }}>
          <Plus className="h-4 w-4" />
          Tambah Program
        </Button>
      </div>

      {(creating || editing) && (
        <ProgramForm
          program={editing}
          modules={modules}
          onDone={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {programs.length === 0 && !creating ? (
        <p className="text-sm text-muted-foreground">Belum ada program. Tambahkan program baru.</p>
      ) : (
        programs.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{p.title}</h3>
                  {p.status === "ACTIVE" ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.target && <Badge variant="outline">Sasaran: {p.target}</Badge>}
                  <Badge variant="outline">{p._count.programModules} modul</Badge>
                  <Badge variant="outline">Urutan {p.order}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const res = await toggleProgram(p.id);
                    if (res?.ok) toast({ title: "Status program diubah", variant: "success" });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  {p.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={async () => {
                    if (!confirmDelete(`Hapus program "${p.title}"? Aksi ini permanen.`)) return;
                    const res = await deleteProgram(p.id);
                    if (res?.ok) toast({ title: "Program dihapus", variant: "success" });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function ProgramForm({
  program,
  modules,
  onDone,
}: {
  program: Program | null;
  modules: ModuleLite[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState(program?.title ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [content, setContent] = useState(program?.content ?? "");
  const [objectives, setObjectives] = useState(program?.objectives ?? "");
  const [target, setTarget] = useState(program?.target ?? "");
  const [order, setOrder] = useState(program?.order ?? 0);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(program?.status ?? "ACTIVE");
  const [imageUrl, setImageUrl] = useState(program?.imageUrl ?? "");
  const [moduleIds, setModuleIds] = useState<string[]>(
    program?.programModules.map((m) => m.moduleId) ?? []
  );

  const submit = async () => {
    const fd = new FormData();
    if (program) fd.set("id", program.id);
    fd.set("title", title);
    fd.set("slug", program?.slug ?? title);
    fd.set("description", description);
    fd.set("content", content);
    fd.set("objectives", objectives);
    fd.set("target", target);
    fd.set("imageUrl", imageUrl);
    fd.set("order", String(order));
    fd.set("status", status);
    moduleIds.forEach((id) => fd.append("moduleIds", id));
    const res = await saveProgram(fd);
    if (res?.ok) {
      toast({ title: program ? "Program diperbarui" : "Program ditambahkan", variant: "success" });
      onDone();
    } else toast({ title: "Gagal", description: res?.error ?? "Terjadi kesalahan.", variant: "error" });
  };

  const toggleModule = (id: string) =>
    setModuleIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle>{program ? "Edit Program" : "Tambah Program Baru"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Judul Program</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Deskripsi Singkat</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid gap-2">
          <Label>Penjelasan Lengkap (opsional)</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
        </div>
        <div className="grid gap-2">
          <Label>Tujuan Pembelajaran (satu per baris)</Label>
          <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Sasaran Peserta</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="mis. Murid SD dan SMP" />
          </div>
          <div className="grid gap-2">
            <Label>Urutan</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Gambar Program (URL)</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... atau /api/files/..." />
          <div className="rounded-xl border border-border bg-white p-3">
            <FileUpload
              kind="SITE_IMAGE"
              label="Upload gambar program"
              accept="image/*"
              onUploaded={(f) => setImageUrl(f.url)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Hubungkan Modul Terkait</Label>
          <div className="grid gap-2 md:grid-cols-2">
            {modules.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  moduleIds.includes(m.id)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-white"
                )}
              >
                <input
                  type="checkbox"
                  checked={moduleIds.includes(m.id)}
                  onChange={() => toggleModule(m.id)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="truncate">{m.title}</span>
                <Badge variant="secondary" className="ml-auto shrink-0">{levelDisplayLabel(m.educationLevel)}</Badge>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit}>
            <Save className="h-4 w-4" />
            Simpan Program
          </Button>
          <Button variant="outline" onClick={onDone}>
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* =====================================================================
   Tab Modul (link ke Kelola Modul yang sudah ada)
   ===================================================================== */

function ModulTab() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="text-lg font-bold">Modul dikelola di menu Kelola Modul</h3>
          <p className="text-sm text-muted-foreground">
            Tab ini terhubung langsung dengan fitur <strong>Kelola Modul</strong> yang sudah ada di
            dashboard Admin. Tidak ada database atau sistem unggahan kedua. Setiap perubahan modul
            otomatis tersinkronisasi dengan halaman Modul publik dan dashboard murid sesuai hak akses.
          </p>
          <Link
            href="/dashboard/admin/modules"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Link2 className="h-4 w-4" />
            Buka Kelola Modul
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* =====================================================================
   Tab Tentang Kami
   ===================================================================== */

function TentangTab({
  blocks,
  missions,
  goals,
}: {
  blocks: Block[];
  missions: Mission[];
  goals: Goal[];
}) {
  const aboutBlocks = blocks.filter((b) =>
    ["ABOUT_PROFILE", "ABOUT_VISION", "ABOUT_MISSION", "ABOUT_GOALS", "ABOUT_PARTNERS"].includes(b.key)
  );

  return (
    <div className="space-y-6">
      {aboutBlocks.map((b) => (
        <BlockCard
          key={b.key}
          block={b}
          label={BLOCK_LABEL[b.key] ?? b.key}
          desc={BLOCK_DESC[b.key] ?? "Konten halaman Tentang Kami."}
        />
      ))}

      {/* Misi items */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Misi</CardTitle>
          <p className="text-sm text-muted-foreground">Tambah, edit, dan hapus item misi.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <SimpleItemForm kind="mission" />
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada item misi.</p>
          ) : (
            missions.map((m) => (
              <SimpleItemRow key={m.id} kind="mission" item={m} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Tujuan items */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tujuan</CardTitle>
          <p className="text-sm text-muted-foreground">Tambah, edit, dan hapus item tujuan.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <SimpleItemForm kind="goal" />
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada item tujuan.</p>
          ) : (
            goals.map((g) => (
              <SimpleItemRow key={g.id} kind="goal" item={g} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SimpleItemForm({ kind }: { kind: "mission" | "goal" }) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim()) {
      toast({ title: "Isi wajib diisi", variant: "error" });
      return;
    }
    const fd = new FormData();
    fd.set("text", text);
    fd.set("order", String(Date.now()));
    fd.set("active", "1");
    const res = kind === "mission" ? await saveMissionItem(fd) : await saveGoalItem(fd);
    if (res?.ok) {
      toast({ title: kind === "mission" ? "Misi ditambahkan" : "Tujuan ditambahkan", variant: "success" });
      setText("");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder={kind === "mission" ? "Tulis misi baru..." : "Tulis tujuan baru..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1"
      />
      <Button size="sm" onClick={submit}>
        <Plus className="h-4 w-4" />
        Tambah
      </Button>
    </div>
  );
}

function SimpleItemRow({
  kind,
  item,
}: {
  kind: "mission" | "goal";
  item: Mission | Goal;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
        <p className="text-sm text-muted-foreground">{item.text}</p>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:bg-red-50"
            onClick={async () => {
              if (!confirmDelete("Hapus item ini?")) return;
              const res = kind === "mission" ? await deleteMissionItem(item.id) : await deleteGoalItem(item.id);
              if (res?.ok) toast({ title: "Item dihapus", variant: "success" });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
      <Input value={text} onChange={(e) => setText(e.target.value)} className="flex-1" />
      <Button
        size="sm"
        onClick={async () => {
          const fd = new FormData();
          fd.set("id", item.id);
          fd.set("text", text);
          fd.set("order", String(item.order));
          fd.set("active", item.active ? "1" : "0");
          const res = kind === "mission" ? await saveMissionItem(fd) : await saveGoalItem(fd);
          if (res?.ok) {
            toast({ title: "Item diperbarui", variant: "success" });
            setEditing(false);
          }
        }}
      >
        <Save className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Batal
      </Button>
    </div>
  );
}

/* =====================================================================
   Tab Kolaborasi Edukasi
   ===================================================================== */

const PARTNER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "SCHOOL", label: "Sekolah" },
  { value: "POLRI", label: "Kepolisian (POLRI)" },
  { value: "JASA_RAHARJA", label: "Jasa Raharja" },
  { value: "OTHER", label: "Mitra Lainnya" },
];

function KolaborasiTab({ partners }: { partners: Partner[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mitra Kolaborasi Edukasi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kelola logo, nama, dan peran mitra kolaborasi (Sekolah, Kepolisian, Jasa Raharja)
            yang tampil pada bagian &quot;Kolaborasi Edukasi&quot; di Beranda dan Tentang Kami.
            Gunakan logo resmi hanya jika aset dan izin penggunaannya tersedia.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <PartnerForm />
          {partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada mitra. Tambahkan Sekolah, Kepolisian, dan Jasa Raharja agar tampil
              sebagai kolaborasi edukasi (default akan ditampilkan jika kosong).
            </p>
          ) : (
            partners.map((p) => <PartnerRow key={p.id} partner={p} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PartnerForm({ initial }: { initial?: Partner }) {
  const [id] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<Partner["role"]>(initial?.role ?? "SCHOOL");
  const [roleLabel, setRoleLabel] = useState(initial?.roleLabel ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [order] = useState(initial?.order ?? 0);
  const [active] = useState(initial?.active ?? true);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Nama mitra wajib diisi", variant: "error" });
      return;
    }
    const fd = new FormData();
    if (id) fd.set("id", id);
    fd.set("name", name);
    fd.set("role", role);
    fd.set("roleLabel", roleLabel);
    fd.set("description", description);
    fd.set("logoUrl", logoUrl);
    fd.set("order", String(order));
    fd.set("active", active ? "1" : "0");
    const res = await saveCollaborationPartner(fd);
    if (res?.ok) toast({ title: id ? "Mitra diperbarui" : "Mitra ditambahkan", variant: "success" });
    else toast({ title: "Gagal", description: res?.error, variant: "error" });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-primary/30 bg-blue-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="partner-name">Nama Mitra</Label>
          <Input id="partner-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Sekolah, Polres Metro Jakarta Selatan, Jasa Raharja" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="partner-role">Kategori Mitra</Label>
          <Select id="partner-role" value={role} onChange={(e) => setRole(e.target.value as Partner["role"])}>
            {PARTNER_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="partner-role-label">Label Peran (opsional)</Label>
          <Input id="partner-role-label" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Mis. Instansi Pemerintah, Lembaga Asuransi" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="partner-logo">URL Logo (opsional)</Label>
          <Input id="partner-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... atau /api/files/..." />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="partner-desc">Deskripsi Peran (opsional)</Label>
        <Textarea id="partner-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan peran mitra dalam edukasi keselamatan lalu lintas..." />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={submit}>
          <Save className="h-4 w-4" />
          {id ? "Simpan Perubahan" : "Tambah Mitra"}
        </Button>
      </div>
    </div>
  );
}

function PartnerRow({ partner }: { partner: Partner }) {
  const [editing, setEditing] = useState(false);
  const roleLabel =
    PARTNER_ROLE_OPTIONS.find((o) => o.value === partner.role)?.label ?? "Mitra";
  return (
    <div className="rounded-xl border border-border p-4">
      {editing ? (
        <PartnerForm initial={partner} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {partner.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logoUrl} alt={partner.name} className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-contain p-1" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
                {partner.role === "SCHOOL" ? "🏫" : partner.role === "POLRI" ? "👮" : partner.role === "JASA_RAHARJA" ? "🤝" : "⭐"}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{partner.name}</p>
                {partner.active ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {roleLabel}
                {partner.roleLabel ? ` • ${partner.roleLabel}` : ""}
              </p>
              {partner.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{partner.description}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50"
              onClick={async () => {
                if (!confirmDelete("Hapus mitra ini?")) return;
                const res = await deleteCollaborationPartner(partner.id);
                if (res?.ok) toast({ title: "Mitra dihapus", variant: "success" });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Tab Kontak
   ===================================================================== */

function KontakTab({
  contactDefaults,
  messages,
}: {
  contactDefaults: { email: string; whatsapp: string; phone: string; address: string; social: string };
  messages: Message[];
}) {
  const [messageList, setMessageList] = useState<Message[]>(messages);
  const [email, setEmail] = useState(contactDefaults.email);
  const [whatsapp, setWhatsapp] = useState(contactDefaults.whatsapp);
  const [phone, setPhone] = useState(contactDefaults.phone);
  const [address, setAddress] = useState(contactDefaults.address);
  const [social, setSocial] = useState(contactDefaults.social);

  const saveContact = async (key: string, value: string, label: string) => {
    const fd = new FormData();
    fd.set("key", key);
    fd.set("title", label);
    fd.set("body", value);
    const res = await saveSiteContent(fd);
    if (res?.ok) toast({ title: `${label} disimpan`, variant: "success" });
    else toast({ title: "Gagal", description: res?.error ?? "Terjadi kesalahan.", variant: "error" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Kontak</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kosongkan kolom untuk menyembunyikan informasi tersebut dari halaman Kontak dan footer.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Email Kontak</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kontak@edulalin.id" />
              <Button size="sm" variant="outline" onClick={() => saveContact("CONTACT_EMAIL", email, "Email Kontak")}>
                <Save className="h-4 w-4" />
                Simpan Email
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="0812xxxxxxx" />
              <Button size="sm" variant="outline" onClick={() => saveContact("CONTACT_WHATSAPP", whatsapp, "WhatsApp")}>
                <Save className="h-4 w-4" />
                Simpan WhatsApp
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Telepon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(021) xxx-xxxx" />
              <Button size="sm" variant="outline" onClick={() => saveContact("CONTACT_PHONE", phone, "Telepon")}>
                <Save className="h-4 w-4" />
                Simpan Telepon
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Media Sosial</Label>
              <Input value={social} onChange={(e) => setSocial(e.target.value)} placeholder="https://instagram.com/edulalin" />
              <Button size="sm" variant="outline" onClick={() => saveContact("CONTACT_SOCIAL", social, "Media Sosial")}>
                <Save className="h-4 w-4" />
                Simpan Media Sosial
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Alamat</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Alamat kantor" />
            <Button size="sm" variant="outline" className="w-fit" onClick={() => saveContact("CONTACT_ADDRESS", address, "Alamat")}>
              <Save className="h-4 w-4" />
              Simpan Alamat
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Pesan Masuk</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pesan dari formulir halaman Kontak. {messageList.filter((m) => m.status === "NEW").length} pesan baru.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {messageList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pesan masuk.</p>
          ) : (
            messageList.map((m) => (
              <div key={m.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </div>
                  <Badge
                    variant={
                      m.status === "NEW" ? "danger" : m.status === "READ" ? "warning" : "success"
                    }
                  >
                    {m.status === "NEW" ? "Baru" : m.status === "READ" ? "Dibaca" : "Selesai"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium">{m.subject}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{m.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(m.createdAt).toLocaleString("id-ID")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Select
                    value={m.status}
                    className="w-32"
                    onChange={async (e) => {
                      const res = await updateContactMessageStatus(
                        m.id,
                        e.target.value as "NEW" | "READ" | "DONE"
                      );
                      if (res?.ok) {
                        setMessageList((prev) =>
                          prev.map((x) =>
                            x.id === m.id
                              ? { ...x, status: e.target.value as "NEW" | "READ" | "DONE" }
                              : x
                          )
                        );
                        toast({ title: "Status pesan diubah", variant: "success" });
                      }
                    }}
                  >
                    <option value="NEW">Baru</option>
                    <option value="READ">Dibaca</option>
                    <option value="DONE">Selesai</option>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirmDelete("Hapus pesan ini?")) return;
                      const res = await deleteContactMessage(m.id);
                      if (res?.ok) {
                        setMessageList((prev) => prev.filter((x) => x.id !== m.id));
                        toast({ title: "Pesan dihapus", variant: "success" });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* =====================================================================
   Tab FAQ
   ===================================================================== */

function FaqTab({ faqs }: { faqs: Faq[] }) {
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setCreating(true); setEditing(null); }}>
          <Plus className="h-4 w-4" />
          Tambah FAQ
        </Button>
      </div>

      {(creating || editing) && (
        <FaqForm
          faq={editing}
          onDone={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada FAQ. Tambahkan pertanyaan baru.</p>
      ) : (
        faqs.map((f) => (
          <Card key={f.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{f.question}</h3>
                  {f.active ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                <p className="mt-1 text-xs text-muted-foreground">Urutan {f.order}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(f)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const res = await toggleFaq(f.id);
                    if (res?.ok) toast({ title: "Status FAQ diubah", variant: "success" });
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {f.active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50"
                  onClick={async () => {
                    if (!confirmDelete(`Hapus FAQ "${f.question}"?`)) return;
                    const res = await deleteFaq(f.id);
                    if (res?.ok) toast({ title: "FAQ dihapus", variant: "success" });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function FaqForm({ faq, onDone }: { faq: Faq | null; onDone: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [order, setOrder] = useState(faq?.order ?? 0);
  const [active, setActive] = useState(faq?.active ?? true);

  const submit = async () => {
    const fd = new FormData();
    if (faq) fd.set("id", faq.id);
    fd.set("question", question);
    fd.set("answer", answer);
    fd.set("order", String(order));
    fd.set("active", active ? "1" : "0");
    const res = await saveFaq(fd);
    if (res?.ok) {
      toast({ title: faq ? "FAQ diperbarui" : "FAQ ditambahkan", variant: "success" });
      onDone();
    } else toast({ title: "Gagal", description: res?.error ?? "Terjadi kesalahan.", variant: "error" });
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle>{faq ? "Edit FAQ" : "Tambah FAQ Baru"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label>Pertanyaan</Label>
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Jawaban</Label>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Urutan</Label>
            <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={submit}>
            <Save className="h-4 w-4" />
            Simpan FAQ
          </Button>
          <Button variant="outline" onClick={onDone}>
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
