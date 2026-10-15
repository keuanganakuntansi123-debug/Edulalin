import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArchivedActions } from "./archived-actions";
import { Archive, RotateCcw, ShieldCheck } from "lucide-react";

export const instant = false;

export default async function AdminArchivedPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 100,
    include: { school: { select: { name: true } } },
  });

  const roleCounts = new Map<string, number>();
  for (const u of users) {
    roleCounts.set(u.role, (roleCounts.get(u.role) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengguna Terhapus</h1>
          <p className="mt-1 text-muted-foreground">
            Akun yang diarsipkan (soft delete). Histori tetap tersimpan dan dapat dipulihkan, atau dihapus permanen.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
          <Archive className="h-4 w-4" />
          {users.length} akun diarsipkan
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["GURU", "MURID", "POLISI"] as const).map((role) => (
          <div
            key={role}
            className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{ROLE_LABEL[role]}</p>
              <p className="text-xl font-bold">{roleCounts.get(role) ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sekolah</TableHead>
                <TableHead>Dihapus</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{u.school?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.deletedAt ? u.deletedAt.toLocaleDateString("id-ID") : "-"}
                  </TableCell>
                  <TableCell>
                    <ArchivedActions userId={u.id} userName={u.name} />
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <RotateCcw className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">Tidak ada akun yang diarsipkan.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
