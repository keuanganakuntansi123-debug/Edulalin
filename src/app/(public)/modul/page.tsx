import { redirect } from "next/navigation";

/**
 * Modul Publik sudah dikembangkan menjadi "Berita & Edukasi".
 * Katalog modul pembelajaran tetap tersedia di dalam dashboard untuk
 * Murid, Guru, dan Polisi yang sudah login.
 */
export const instant = false;

export default function ModulPage() {
  redirect("/berita");
}