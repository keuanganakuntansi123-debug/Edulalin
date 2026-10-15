# Database

Prisma ORM 7 + PostgreSQL. Generator `prisma-client` output ke
`src/generated/prisma`. Konfigurasi di `prisma/prisma7.config.ts`.

## Entity Utama

### School

```prisma
model School {
  id             String   @id @default(cuid())
  code           String   @unique          // kode unik sekolah
  name           String
  educationLevel EducationLevel            // SD | SMP | SMA | SIM
  address        String?
  city           String?
  province       String?
  status         SchoolStatus              // ACTIVE | INACTIVE
  users          User[]
  modules        Module[]
  quizzes        Quiz[]
  activityLogs   ActivityLog[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### User

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String                       // bcryptjs, SALT_ROUNDS=12
  role          Role     // ADMIN | GURU | POLISI | MURID
  schoolId      String?
  school        School?  @relation(...)
  educationLevel EducationLevel?
  classLevel    String?
  birthDate     DateTime?
  phone         String?
  status        UserStatus                   // ACTIVE | INACTIVE
  verifiedAt    DateTime?
  deletedAt     DateTime?                    // SOFT DELETE
  moduleProgress ModuleProgress[]
  quizAttempts  QuizAttempt[]
  answers       QuizAnswer[]
  activityLogs  ActivityLog[]
}
```

### Module

```prisma
model Module {
  id            String   @id @default(cuid())
  title         String
  description   String?
  educationLevel EducationLevel
  classLevel    String?            // null = semua kelas di jenjang itu
  schoolId      String?            // null = global
  school        School? @relation(...)
  moduleType    ModuleType         // PDF | VIDEO | LINK | DOCUMENT
  contentUrl    String?
  thumbnailUrl  String?
  durationMin   Int?
  order         Int
  status        ModuleStatus       // ACTIVE | INACTIVE | ARCHIVED
  deletedAt     DateTime?          // SOFT DELETE
  progresses    ModuleProgress[]
  quizzes       Quiz[]
}
```

### Quiz, Question, QuizAttempt, QuizAnswer, ModuleProgress

- `Quiz`: title, description, moduleId?, educationLevel, classLevel?,
  schoolId? (nullable relation ke School), minScore (default 60),
  maxAttempts?, shuffle, showResult/showDiscussion, status, deletedAt.
- `Question`: quizId FK, text, optionA–D, correctOption (A|B|C|D), weight,
  explanation, order.
- `QuizAttempt`: userId, quizId, status (`IN_PROGRESS` | `COMPLETED`),
  score?, passed?, startedAt, submittedAt? — soft-delete tidak dipakai
  (riwayat attempt harus utuh).
- `QuizAnswer`: attemptId, questionId, selectedOption, isCorrect, + unique
  (attemptId, questionId).
- `ModuleProgress`: userId, moduleId, progress (0–100), completed, lastReadAt
  — unique (userId, moduleId).

### ActivityLog

`actorId?`, `schoolId?`, `action` (LOGIN, REGISTER, LOGOUT, MODULE_CREATE,
QUIZ_CREATE, QUIZ_SUBMIT, USER_ARCHIVE, USER_RESTORE, USER_STATUS, ...),
`entity`, `entityId?`, `metadata Json?`, `ipAddress?`, `userAgent?`, `createdAt`.

## Migration & Seed

```bash
npx prisma migrate dev --name init   # butuh PostgreSQL aktif & DATABASE_URL
npm run seed                         # isi data demo (idempotent via upsert email)
npx prisma validate
npx prisma generate
```

Seeder membuat 2 sekolah (SMA 1 Jakarta, SMP 2 Bandung), admin, guru, polisi,
3 murid, modul SD/SMP/SMA/SIM + modul khusus sekolah, kuis + soal, progress,
attempt, dan activity log. Password demo `Demo1234!`.

## Catatan Integrity

- School-level isolation: relasi User→School, Module.schoolId (nullable),
  Quiz.schoolId (nullable). Query wajib memfilter scope di server.
- Soft delete: `User.deletedAt`, `Module.deletedAt`, `Quiz.deletedAt`.
  Histori attempt/activity tidak dihapus.
- Unique constraint mencegah duplikasi progress & jawaban per attempt.