import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { restoreUser, permanentDeleteUser } from "@/app/actions/admin-actions";
import { Trash2, RotateCcw } from "lucide-react";

export const instant = false;

async function restoreUserAction(id: string) {
  "use server";
  await restoreUser(id);
}

async function permanentDeleteUserAction(id: string) {
  "use server";
  await permanentDeleteUser(id);
}

export default async function AdminArchivedPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 100,
    include: { school: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Pengguna Terhapus</h1>
      <p className="mt-1 text-muted-foreground">
        Akun yang diarsipkan (soft delete). Histori tetap tersimpan dan dapat dipulihkan, atau dihapus permanen.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
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
                  <div className="flex items-center gap-2">
                    <form action={restoreUserAction.bind(null, u.id)}>
                      <Button type="submit" size="sm" variant="outline" className="text-emerald-600">
                        <RotateCcw className="h-4 w-4" />
                        Pulihkan
                      </Button>
                    </form>
                    <form
                      action={permanentDeleteUserAction.bind(null, u.id)}
                      onSubmit={(e) => {
                        const ok = window.confirm(
                          `Hapus permanen akun "${u.name}"?\n\nAkun, data belajar, sesi, dan file miliknya akan dihapus dari sistem secara permanen dan TIDAK DAPAT dipulihkan kembali.`
                        );
                        if (!ok) e.preventDefault();
                      }}
                    >
                      <Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                        Hapus Permanen
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tidak ada akun yang diarsipkan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
