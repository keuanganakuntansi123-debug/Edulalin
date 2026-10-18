import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";

export const instant = false;

export default async function PolisiKerjakanKuisDetailPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  void params;
  await requireRole("POLISI");
  redirect("/dashboard/polisi/kuis");
}
