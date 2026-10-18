import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    birthDate: z.coerce.date("Tanggal lahir wajib diisi"),
    schoolName: z.string().min(2, "Nama sekolah wajib diisi"),
    educationLevel: z.string().optional(),
    classLevel: z.string().min(1, "Kelas wajib diisi"),
    major: z.string().optional(),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[a-zA-Z]/, "Password wajib mengandung huruf")
      .regex(/[0-9]/, "Password wajib mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  })
  .superRefine((d, ctx) => {
    const level = normalizeLevelForValidation(d.educationLevel);
    if ((level === "SMA" || level === "SMK") && !d.major?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jurusan wajib diisi untuk jenjang SMA/SMK",
        path: ["major"],
      });
    }
  });

function normalizeLevelForValidation(level?: string): string | null {
  const v = (level ?? "").trim().toUpperCase();
  if (["SD", "SMP", "SMA", "SMK", "SIM"].includes(v)) return v;
  return null;
}

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const moduleSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  isSim: z.boolean().default(false),
  educationLevel: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  moduleType: z.enum(["PDF", "VIDEO", "LINK", "DOCUMENT"]),
  contentUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  durationMin: z.coerce.number().int().positive().optional().nullable(),
  order: z.coerce.number().int().default(0),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const quizSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().optional(),
  moduleId: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  minScore: z.coerce.number().int().min(0).max(100).default(60),
  maxAttempts: z.coerce.number().int().positive().optional().nullable(),
  shuffle: z.boolean().default(false),
  showResult: z.boolean().default(true),
  showDiscussion: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const questionSchema = z.object({
  quizId: z.string().min(1),
  text: z.string().min(3),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctOption: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  weight: z.coerce.number().int().positive().default(1),
  explanation: z.string().optional(),
  order: z.coerce.number().int().default(0),
});

export const submitQuizSchema = z.object({
  attemptId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOption: z.enum(["A", "B", "C", "D"]),
    })
  ),
});

export const schoolSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(3),
  educationLevel: z.enum(["SD", "SMP", "SMA", "SMK", "SIM"]),
  address: z.string().min(3),
  city: z.string().min(2),
  province: z.string().min(2),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["GURU", "POLISI"]),
  birthDate: z.coerce.date().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  educationLevel: z.enum(["SD", "SMP", "SMA", "SMK", "SIM"]).optional().nullable(),
  classLevel: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("ACTIVE"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;