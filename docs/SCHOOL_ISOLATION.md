# School Isolation (Multi-Tenant)

Invariant kritis: **data SMA A tidak pernah bocor ke SMA B**. Seluruh query
data pengguna, modul, progress, kuis, dan laporan dijalankan **di server**
dengan scope sekolah + jenjang + kelas.

## Kontrak Scope

| Elemen        | Dimiliki oleh          | Aturan                                    |
| ------------- | ---------------------- | ----------------------------------------- |
| User          | `schoolId` (nullable)  | Murid/guru selalu punya sekolah           |
| Module        | `schoolId` (nullable)  | `null` = global, selain itu khusus sekolah |
| Quiz          | `schoolId` (nullable)  | `null` = global, selain itu khusus sekolah |
| Progress/Attempt | user            | Selalu di-scope oleh user yang login       |
| ActivityLog   | `schoolId` (nullable)  | Log sekolah terlihat untuk ADMIN          |

## Mekanisme

### `assertSameSchoolOrAdmin(user, targetSchoolId)`

- `ADMIN` → selalu `true` (global).
- target `null`/`undefined` (konten global) → `true`.
- selain itu → `user.schoolId === targetSchoolId`.

### `canAccessContent({ user, content })`

- `ADMIN` → semua.
- Konten khusus sekolah harus match `user.schoolId`.
- MURID juga dicek `educationLevel` & `classLevel` (bila content
  menentukan kelas).

### Query Pattern

```ts
// Contoh: daftar modul murid (module-service)
where: {
  deletedAt: null,
  status: "ACTIVE",
  AND: [
    { OR: [{ schoolId: null }, { schoolId }] },   // global + sekolah sendiri
    { educationLevel },
    ...(classLevel ? [{ OR: [{ classLevel: null }, { classLevel }] }] : []),
    ...(educationLevel === "SIM" && !simAllowed ? [{ id: "tidak-ada" }] : []),
  ],
}
```

### Halaman Guru & Polisi

- GURU: murid, modul, kuis, laporan hanya untuk `schoolId` milik guru
  (dari session, bukan dari query param).
- POLISI: baca lintas sekolah (`findMany` tanpa filter sekolah) — read-only,
  tidak ada mutasi.

## Larangan

- Jangan pernah memakai `schoolId` dari body/query untuk menentukan akses —
  selalu pakai scope dari session server.
- Jangan melewati `assertSameSchoolOrAdmin` / `canAccessContent` untuk
  data sensitif lintas user.