import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolStats } from "@/components/charts/school-stats";
import { policeLevelLabel } from "@/lib/constants";

export const instant = false;

const PERIOD_OPTIONS = [
  { value: "harian", label: "Harian" },
  { value: "bulanan", label: "Bulanan" },
  { value: "tahunan", label: "Tahunan" },
] as const;

type Period = "harian" | "bulanan" | "tahunan";

function fmtDay(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function fmtYear(d: Date): string {
  return String(d.getFullYear());
}

/** Kelompokkan daftar tanggal menjadi bucket sesuai periode. */
function bucketize(dates: Date[], period: Period): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const d of dates) {
    const key =
      period === "harian"
        ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        : period === "bulanan"
          ? `${d.getFullYear()}-${d.getMonth()}`
          : `${d.getFullYear()}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sortKey = (d: Date) =>
    period === "harian"
      ? d.getTime()
      : period === "bulanan"
        ? d.getFullYear() * 12 + d.getMonth()
        : d.getFullYear();
  const labelFn = period === "harian" ? fmtDay : period === "bulanan" ? fmtMonth : fmtYear;

  return [...map.entries()]
    .map(([key, count]) => {
      const [y, m, day] = key.split("-").map(Number);
      const d = new Date(y, m ?? 0, day ?? 1);
      return { label: labelFn(d), count, sort: sortKey(d) };
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ label, count }) => ({ label, count }));
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole("ADMIN");
  const { period: periodParam } = await searchParams;
  const period: Period =
    periodParam === "harian" || periodParam === "bulanan" || periodParam === "tahunan"
      ? periodParam
      : "harian";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeStart =
    period === "harian"
      ? new Date(startOfToday.getTime() - 13 * 24 * 60 * 60 * 1000)
      : period === "bulanan"
        ? new Date(now.getFullYear(), now.getMonth() - 5, 1)
        : new Date(now.getFullYear() - 4, 0, 1);

  const [schools, guruList, muridList, polisiList, totalKuis, moduleStats, quizAttempts] =
    await Promise.all([
      prisma.school.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      prisma.user.findMany({
        where: { role: "GURU", deletedAt: null },
        select: { id: true, schoolId: true, status: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { role: "MURID", deletedAt: null },
        select: { id: true, schoolId: true, status: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { role: "POLISI", deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          policeLevel: true,
          policeUnit: true,
          policeDivision: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.quiz.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.module.findMany({
        where: { deletedAt: null },
        select: {
          title: true,
          _count: { select: { progresses: { where: { completed: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.quizAttempt.findMany({
        where: { status: "COMPLETED", user: { role: "MURID" } },
        select: { score: true, passed: true, submittedAt: true, userId: true },
        take: 2000,
      }),
    ]);

  // ---------- Grup A: Sekolah / Guru / Murid ----------
  const schoolData = schools.map((s) => {
    const guru = guruList.filter((g) => g.schoolId === s.id).length;
    const murid = muridList.filter((m) => m.schoolId === s.id).length;
    return {
      name: s.name,
      guru,
      murid,
      registrations: guru + murid,
      status: s.status,
      createdAt: s.createdAt,
    };
  });

  const totalSekolah = schools.length;
  const totalGuru = guruList.length;
  const totalMurid = muridList.length;
  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const inactiveSchools = totalSekolah - activeSchools;
  const activeGuru = guruList.filter((g) => g.status === "ACTIVE").length;
  const activeMurid = muridList.filter((m) => m.status === "ACTIVE").length;

  const topSchools = [...schoolData]
    .sort((a, b) => b.registrations - a.registrations || a.name.localeCompare(b.name))
    .slice(0, 10);

  const muridRegistrationsByDate = muridList
    .filter((m) => m.createdAt >= rangeStart)
    .map((m) => m.createdAt);
  const guruRegistrationsByDate = guruList
    .filter((g) => g.createdAt >= rangeStart)
    .map((g) => g.createdAt);
  const registrationGrowth = bucketize(
    [...muridRegistrationsByDate, ...guruRegistrationsByDate],
    period
  );
  const muridGrowth = bucketize(muridRegistrationsByDate, period);
  const guruGrowth = bucketize(guruRegistrationsByDate, period);

  // ---------- Grup B: Kepolisian ----------
  const totalPolisi = polisiList.length;
  const activePolisi = polisiList.filter((p) => p.status === "ACTIVE").length;
  const inactivePolisi = totalPolisi - activePolisi;
  const policeGrowth = bucketize(
    polisiList.filter((p) => p.createdAt >= rangeStart).map((p) => p.createdAt),
    period
  );

  const policeByUnit = new Map<string, number>();
  for (const p of polisiList) {
    const key = [policeLevelLabel(p.policeLevel), p.policeUnit ?? "-"]
      .filter(Boolean)
      .join(" — ") || "Tanpa Kesatuan";
    policeByUnit.set(key, (policeByUnit.get(key) ?? 0) + 1);
  }
  const policeUnitData = [...policeByUnit.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // ---------- Kuis (dipertahankan, dipisahkan) ----------
  const attemptCount = quizAttempts.length;
  const avgScore = attemptCount
    ? Math.round(quizAttempts.reduce((a, x) => a + (x.score ?? 0), 0) / attemptCount)
    : 0;
  const passedCount = quizAttempts.filter((a) => a.passed).length;
  const passRate = attemptCount ? Math.round((passedCount / attemptCount) * 100) : 0;
  const uniqueQuizTakers = new Set(quizAttempts.map((a) => a.userId)).size;

  return (
    <div>
      <h1 className="text-2xl font-bold">Laporan &amp; Statistik</h1>
      <p className="mt-1 text-muted-foreground">
        Fokus pada pendaftaran pengguna, pertumbuhan peserta, aktivitas sekolah, dan statistik kepolisian.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-xs font-medium text-muted-foreground">Periode Grafik</label>
          <select name="period" defaultValue={period} className="h-10 rounded-lg border border-border bg-white px-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-blue-800">Terapkan</button>
        <a href="/dashboard/admin/reports" className="h-10 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted">Reset</a>
      </form>

      {/* ============ Grup A ============ */}
      <h2 className="mt-8 text-lg font-bold text-slate-800">Statistik Sekolah, Guru &amp; Murid</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Sekolah", totalSekolah],
          ["Total Guru", totalGuru],
          ["Total Murid", totalMurid],
          ["Sekolah Aktif", `${activeSchools} dari ${totalSekolah}`],
          ["Sekolah Nonaktif", inactiveSchools],
          ["Guru Aktif", `${activeGuru} dari ${totalGuru}`],
          ["Murid Aktif", `${activeMurid} dari ${totalMurid}`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pertumbuhan Pendaftaran (Guru &amp; Murid)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Grafik {period === "harian" ? "harian" : period === "bulanan" ? "bulanan" : "tahunan"}.
            </p>
          </CardHeader>
          <CardContent>
            {registrationGrowth.length > 0 ? (
              <SchoolStats data={registrationGrowth} bars={["count"]} color="#1d4ed8" />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pendaftaran pada periode ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendaftaran Guru vs Murid</CardTitle>
          </CardHeader>
          <CardContent>
            {guruGrowth.length > 0 || muridGrowth.length > 0 ? (
              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Murid</p>
                  <SchoolStats data={muridGrowth.length ? muridGrowth : [{ label: "-", count: 0 }]} bars={["count"]} color="#f59e0b" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guru</p>
                  <SchoolStats data={guruGrowth.length ? guruGrowth : [{ label: "-", count: 0 }]} bars={["count"]} color="#10b981" />
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data pada periode ini.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Sekolah berdasarkan Pendaftar</CardTitle>
            <p className="text-xs text-muted-foreground">Sekolah dengan jumlah guru + murid terdaftar terbanyak.</p>
          </CardHeader>
          <CardContent>
            {topSchools.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Sekolah</th>
                      <th className="px-3 py-2">Guru</th>
                      <th className="px-3 py-2">Murid</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topSchools.map((s) => (
                      <tr key={s.name}>
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2">{s.guru}</td>
                        <td className="px-3 py-2">{s.murid}</td>
                        <td className="px-3 py-2">
                          {s.status === "ACTIVE" ? <Badge variant="success">Aktif</Badge> : <Badge variant="danger">Nonaktif</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data sekolah.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detail per Sekolah</CardTitle>
            <p className="text-xs text-muted-foreground">Jumlah guru, murid, dan tanggal pendaftaran sekolah.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Sekolah</th>
                    <th className="px-3 py-2">Guru</th>
                    <th className="px-3 py-2">Murid</th>
                    <th className="px-3 py-2">Terdaftar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {schoolData.map((s) => (
                    <tr key={s.name}>
                      <td className="px-3 py-2 font-medium">{s.name}</td>
                      <td className="px-3 py-2">{s.guru}</td>
                      <td className="px-3 py-2">{s.murid}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {s.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {schoolData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Belum ada sekolah.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============ Grup B: Kepolisian ============ */}
      <h2 className="mt-10 text-lg font-bold text-slate-800">Statistik Kepolisian</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Akun Kepolisian", totalPolisi],
          ["Aktif", `${activePolisi} dari ${totalPolisi}`],
          ["Nonaktif", inactivePolisi],
          ["Jumlah Kesatuan", policeUnitData.length],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pertumbuhan Akun Kepolisian</CardTitle>
            <p className="text-xs text-muted-foreground">
              Grafik {period === "harian" ? "harian" : period === "bulanan" ? "bulanan" : "tahunan"}.
            </p>
          </CardHeader>
          <CardContent>
            {policeGrowth.length > 0 ? (
              <SchoolStats data={policeGrowth} bars={["count"]} color="#0284c7" />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pendaftaran kepolisian pada periode ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akun per Kesatuan</CardTitle>
            <p className="text-xs text-muted-foreground">Berdasarkan tingkat &amp; nama kesatuan.</p>
          </CardHeader>
          <CardContent>
            {policeUnitData.length > 0 ? (
              <SchoolStats data={policeUnitData} bars={["count"]} color="#0284c7" />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada akun kepolisian.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Daftar Akun Kepolisian</CardTitle>
          <p className="text-xs text-muted-foreground">Nama, kesatuan asal, dan status akun.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Tingkat</th>
                  <th className="px-3 py-2">Nama Kesatuan</th>
                  <th className="px-3 py-2">Divisi / Bagian</th>
                  <th className="px-3 py-2">Terdaftar</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {polisiList.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">{policeLevelLabel(p.policeLevel)}</td>
                    <td className="px-3 py-2">{p.policeUnit ?? "-"}</td>
                    <td className="px-3 py-2">{p.policeDivision ?? "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2">
                      {p.status === "ACTIVE" ? <Badge variant="success">Aktif</Badge> : <Badge variant="danger">Nonaktif</Badge>}
                    </td>
                  </tr>
                ))}
                {polisiList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Belum ada akun kepolisian.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ============ Kuis (dipertahankan) ============ */}
      <h2 className="mt-10 text-lg font-bold text-slate-800">Statistik Kuis Pembelajaran</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Kuis Dikerjakan", attemptCount],
          ["Peserta Unik", uniqueQuizTakers],
          ["Rata-rata Nilai", avgScore ? `${avgScore}/100` : "-"],
          ["Tingkat Kelulusan", `${passRate}%`],
          ["Kuis Aktif", totalKuis],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Modul Terselesaikan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {moduleStats.map((m) => (
              <li key={m.title} className="flex items-center justify-between text-sm">
                <span className="truncate">{m.title}</span>
                <Badge variant="secondary">{m._count.progresses} selesai</Badge>
              </li>
            ))}
            {moduleStats.length === 0 && (
              <li className="text-sm text-muted-foreground">Belum ada data modul.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
