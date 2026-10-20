export const NEWS_CATEGORIES = [
  { value: "SD", label: "SD", emoji: "🧒", blurb: "Pengenalan aman di jalan untuk anak" },
  { value: "SMP", label: "SMP", emoji: "🧑", blurb: "Remaja & etika berlalu lintas" },
  { value: "SMA", label: "SMA", emoji: "🧑‍🎓", blurb: "Keselamatan berkendara muda" },
  { value: "SMK", label: "SMK", emoji: "👷", blurb: "Keselamatan kerja & berkendara" },
  { value: "SIM", label: "SIM", emoji: "🪪", blurb: "Panduan menuju SIM" },
] as const;

export const NEWS_CATEGORY_META: Record<string, { label: string; emoji: string; classes: string }> = {
  SD: { label: "SD", emoji: "🧒", classes: "bg-emerald-100 text-emerald-700" },
  SMP: { label: "SMP", emoji: "🧑", classes: "bg-sky-100 text-sky-700" },
  SMA: { label: "SMA", emoji: "🧑‍🎓", classes: "bg-indigo-100 text-indigo-700" },
  SMK: { label: "SMK", emoji: "👷", classes: "bg-amber-100 text-amber-700" },
  SIM: { label: "SIM", emoji: "🪪", classes: "bg-blue-100 text-blue-700" },
};

export const NEWS_CATEGORY_VALUES = ["SD", "SMP", "SMA", "SMK", "SIM"] as const;