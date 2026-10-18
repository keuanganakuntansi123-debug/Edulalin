# Modul Materi

## Model

`Module` (lihat [DATABASE.md](DATABASE.md)): judul, deskripsi, jenjang
(`SD`/`SMP`/`SMA`/`SMK`), kelas opsional, sekolah opsional (null = global),
tipe materi (`PDF`, `VIDEO`, `LINK`, `DOCUMENT`), URL konten/thumbnail,
durasi, urutan, status, soft delete.

## Kategori & SIM

Kategori jenjang yang berdiri sendiri di UI: **SD, SMP, SMA, SMK**.
**SIM bukan kategori** — SIM adalah jenis materi khusus dalam kategori
SMA/SMK (disimpan sebagai `educationLevel = "SIM"`):

- Dipilih lewat toggle "SIM" pada form modul/kuis (hanya muncul saat
  jenjang SMA atau SMK dipilih).
- Hanya dapat ditargetkan ke sekolah SMA/SMK (`validateCategorySchoolMatch`).
- Murid SMA/SMK dapat melihatnya, tetapi murid < 17 tahun diblokir
  (`canAccessSim(birthDate)` → `getAge >= 17`); guru/polisi tanpa batas usia.
- `categoryOf("SIM")` = `SMA` untuk pengelompokan daftar admin.

## Visibilitas

Dihitung server-side di `listModulesForMurid`:

- `deletedAt: null` dan `status: ACTIVE`.
- Global (`schoolId: null`) **atau** sekolah sendiri.
- Jenjang harus sama dengan murid (SD→SD, SMP→SMP, SMA→SMA, SMK→SMK).
- Bila murid punya kelas: konten berkelas hanya tampil bila cocok;
  konten tanpa kelas tetap tampil.
- Murid SMA/SMK juga melihat modul SIM; **modul SIM disembunyikan total
  untuk murid < 17 tahun**
  (`canAccessSim(birthDate)` → `getAge >= 17`).

## Akses per Modul

`getModuleForUser({ moduleId, user })`:

- Menolak modul terhapus/tidak aktif.
- Admin boleh semua.
- Murid/guru hanya modul global atau sekolah sendiri; murid juga harus
  jenjang cocok; modul SIM divalidasi usia **di server**.
- Guru hanya melihat modul sesuai jenjang sekolah tempat mengajar
  (`listModulesForGuru` diffilter `educationLevel`; SIM hanya untuk
  sekolah SMA/SMK).

## Progress Membaca

`updateModuleProgress` (server action `saveProgressAction`):

- Upsert `ModuleProgress` per (user, modul) — unique constraint.
- `progress` 0–100; `completed: true` saat >= 100.
- Dicatat activity `MODULE_PROGRESS` (fire-and-forget) + `revalidatePath`.

## Upload Konten (limitation)

`contentUrl`/`thumbnailUrl` saat ini menerima URL. Bila upload file
diperlukan, gunakan storage aman (mis. S3/R2 + presigned URL) dan validasi
tipe & ukuran di server sebelum menyimpan. Jangan pernah menyimpan file
langsung ke filesystem production.