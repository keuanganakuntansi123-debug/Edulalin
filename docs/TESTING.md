# Testing

Unit test dengan **Vitest**. File test `src/**/*.test.ts`, config
`vitest.config.mts` (alias `@` → `src`).

```bash
npm run test        # vitest run
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # next build (verifikasi kompilasi + prerender)
```

## Cakupan Saat Ini

| File                          | Topik                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| `src/lib/constants.test.ts`   | `getAge` (tepat/pre/post ulang tahun), `canAccessSim` (17+), `dashboardPath`, label konstan |
| `src/lib/guards.test.ts`      | `assertSameSchoolOrAdmin` (admin/global/sekolah lain), `canAccessContent` (role, jenjang, kelas, school) |
| `src/lib/validations.test.ts` | Zod `loginSchema`, `registerSchema`, `moduleSchema`, `quizSchema`, `questionSchema` |

Total 34 test. Test murni (tanpa DB); blok import DB di-mock dengan
`vi.mock("@/lib/prisma", ...)` / `vi.mock("@/lib/session", ...)`.

## Menambah Test

- Test logic bisnis murni tanpa menyentuh DB/network.
- Mock `@/lib/prisma` bila mengimpor service yang memuat chain Prisma.
- Untuk service ber-DB (`quiz-service`, `module-service`, `auth`), mock
  `prisma` dan uji decision logic (mis. nilai skor kuis, scope modul SIM).