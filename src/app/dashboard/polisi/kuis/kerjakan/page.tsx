import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";

export const instant = false;

export default async function PolisiKerjakanKuisPage() {
  await requireRole("POLISI");
  redirect("/dashboard/polisi/kuis");
}
