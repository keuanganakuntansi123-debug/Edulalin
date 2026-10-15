import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default async function DashboardIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  switch (user.role) {
    case "ADMIN":
      redirect("/dashboard/admin");
    case "GURU":
      redirect("/dashboard/guru");
    case "POLISI":
      redirect("/dashboard/polisi");
    default:
      redirect("/dashboard/murid");
  }
}