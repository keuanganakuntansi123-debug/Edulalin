import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard/shell";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard";

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      avatarUrl={user.embeddedAvatar ?? user.avatarUrl}
      pathname={pathname}
    >
      {children}
    </DashboardShell>
  );
}