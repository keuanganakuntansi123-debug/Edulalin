export const NEWS_CATEGORIES = [
  { value: "SD", label: "SD", icon: "/kategori-sd.svg", blurb: "Pengenalan aman di jalan untuk anak" },
  { value: "SMP", label: "SMP", icon: "/kategori-smp.svg", blurb: "Remaja & etika berlalu lintas" },
  { value: "SMA", label: "SMA", icon: "/kategori-sma.svg", blurb: "Keselamatan berkendara muda" },
  { value: "SMK", label: "SMK", icon: "/kategori-smk.svg", blurb: "Keselamatan kerja & berkendara" },
  { value: "SIM", label: "SIM", icon: "/kategori-sim.svg", blurb: "Panduan menuju SIM" },
] as const;

export const NEWS_CATEGORY_META: Record<string, { label: string; icon: string; classes: string }> = {
  SD: { label: "SD", icon: "/kategori-sd.svg", classes: "bg-emerald-100 text-emerald-700" },
  SMP: { label: "SMP", icon: "/kategori-smp.svg", classes: "bg-sky-100 text-sky-700" },
  SMA: { label: "SMA", icon: "/kategori-sma.svg", classes: "bg-indigo-100 text-indigo-700" },
  SMK: { label: "SMK", icon: "/kategori-smk.svg", classes: "bg-amber-100 text-amber-700" },
  SIM: { label: "SIM", icon: "/kategori-sim.svg", classes: "bg-blue-100 text-blue-700" },
};

export const NEWS_CATEGORY_VALUES = ["SD", "SMP", "SMA", "SMK", "SIM"] as const;