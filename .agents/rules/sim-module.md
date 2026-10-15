---
trigger: model_decision
description: "Terapkan saat membuat atau mengubah modul SIM, kalkulasi umur, gate akses usia 17 tahun, atau konten lain yang memakai aturan umur — berisi aturan gating backend."
---

# Aturan Modul SIM — EDULALIN

## Aturan Umur (Backend Wajib)

- Saat registrasi murid: tanggal lahir WAJIB mengisi, dihitung umur berdasarkan tanggal hari ini (bukan hanya tahun lahir).
- Modul SIM hanya terbuka untuk murid usia **>= 17 tahun**.
- Jika umur < 17, modul SIM tidak ditampilkan dan tidak dapat dibuka.
- Backend WAJIB memvalidasi aturan ini **setiap kali** modul SIM diakses — frontend hanya sebagai UX.
- Jika pengguna tepat berulang tahun ke-17, akses otomatis tersedia tanpa intervensi admin.
- Jika tanggal lahir diubah, lakukan validasi ulang dan catat audit.

## Implementasi

- Hitung umur dari `birth_date` terhadap tanggal hari ini:

```ts
function getAge(birthDate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
```

- Pada setiap route/service tampilan maupun fetch modul SIM: ambil `birth_date` dari session/DB, hitung umur, lalu tolak dengan `403`/`404` jika < 17.
- Jangan pernah menyimpan atau mengandalkan flag "sudah boleh SIM" yang hanya diatur manual tanpa validasi ulang.

## UI/UX untuk Murid yang Belum Memenuhi Syarat

- Tampilkan status jelas: "Belum tersedia — Modul SIM terbuka saat usia Anda mencapai 17 tahun."
- Jangan tampilkan materi SIM kepada pengguna yang belum memenuhi syarat.

## Test yang Harus Ada (detail di `testing.md`)

- Murid usia 16 tahun TIDAK dapat mengakses SIM.
- Murid tepat usia 17 tahun DAPAT mengakses SIM.