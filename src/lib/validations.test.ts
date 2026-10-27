import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, moduleSchema, quizSchema, questionSchema } from "@/lib/validations";

describe("loginSchema", () => {
  it("menerima input valid", () => {
    const res = loginSchema.safeParse({ email: "dina@sma1jakarta.sch.id", password: "Demo1234!" });
    expect(res.success).toBe(true);
  });

  it("menolak email tidak valid", () => {
    const res = loginSchema.safeParse({ email: "bukan-email", password: "Demo1234!" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path.join(".")).toBe("email");
    }
  });

  it("menolak password kosong", () => {
    const res = loginSchema.safeParse({ email: "a@b.c", password: "" });
    expect(res.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Murid Baru",
    email: "baru@sekolah.sch.id",
    birthDate: "2010-01-01",
    schoolName: "SMP Negeri 1 Jakarta",
    educationLevel: "SMP",
    classLevel: "VIII A",
    password: "Password1",
    confirmPassword: "Password1",
  };

  it("menerima input valid", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak password tanpa angka", () => {
    const res = registerSchema.safeParse({ ...valid, password: "Password", confirmPassword: "Password" });
    expect(res.success).toBe(false);
  });

  it("menolak konfirmasi password tidak sama", () => {
    const res = registerSchema.safeParse({ ...valid, confirmPassword: "Beda1234" });
    expect(res.success).toBe(false);
  });

  it("menolak password di bawah 8 karakter", () => {
    const res = registerSchema.safeParse({ ...valid, password: "A1", confirmPassword: "A1" });
    expect(res.success).toBe(false);
  });

  it("tidak mewajibkan jurusan untuk SD/SMP", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "SDN BUDI LUHUR",
      educationLevel: "SD",
      classLevel: "5",
    });
    expect(res.success).toBe(true);
  });

  it("mewajibkan jurusan untuk SMA/SMK", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "SMKN 15 JAKARTA",
      educationLevel: "SMK",
      classLevel: "12",
      major: "",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join(".") === "major")).toBe(true);
    }
  });

  it("menerima jurusan untuk SMA/SMK", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "smkn 15 jakarta",
      educationLevel: "SMK",
      classLevel: "12",
      major: "tkj",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.major).toBe("TKJ");
  });

  it("menolak nama sekolah tanpa prefiks resmi", () => {
    const res = registerSchema.safeParse({ ...valid, schoolName: "SEKOLAH BEBAS" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join(".") === "schoolName")).toBe(true);
    }
  });

  it("normalisasi identitas menjadi huruf kapital", () => {
    const res = registerSchema.safeParse({
      ...valid,
      name: "murid baru",
      schoolName: "smpn 1 jakarta",
      classLevel: "8a",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("MURID BARU");
      expect(res.data.schoolName).toBe("SMPN 1 JAKARTA");
      expect(res.data.classLevel).toBe("8A");
    }
  });

  it("mengosongkan jurusan untuk SD/SMP walau diisi", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "SMPN 13 JAKARTA",
      educationLevel: "SMP",
      classLevel: "8",
      major: "IPA",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.major).toBe("");
  });

  it("menyetarakan penulisan panjang nama sekolah menjadi bentuk kanonik", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "smp negeri 1 jakarta",
      educationLevel: "SMP",
      classLevel: "8",
      major: "IPA",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.schoolName).toBe("SMPN 1 JAKARTA");
  });

  it("menolak prefiks sekolah yang tidak sesuai jenjang", () => {
    const res = registerSchema.safeParse({
      ...valid,
      schoolName: "SDN 5 JAKARTA",
      educationLevel: "SMA",
      classLevel: "10",
      major: "IPA",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path.join(".") === "schoolName")).toBe(true);
    }
  });
});

describe("moduleSchema", () => {
  it("menerima input minimal valid", () => {
    const res = moduleSchema.safeParse({
      title: "Rambu Lalu Lintas",
      description: "Mengenal rambu lalu lintas dasar.",
      educationLevel: "SD",
      moduleType: "PDF",
    });
    expect(res.success).toBe(true);
  });

  it("menolak judul terlalu pendek", () => {
    const res = moduleSchema.safeParse({
      title: "ab",
      description: "Deskripsi memadai.",
      educationLevel: "SD",
      moduleType: "PDF",
    });
    expect(res.success).toBe(false);
  });
});

describe("quizSchema", () => {
  it("default minScore 60", () => {
    const res = quizSchema.safeParse({
      title: "Kuis Rambu",
      description: "",
      educationLevel: "SD",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.minScore).toBe(60);
      expect(res.data.status).toBe("ACTIVE");
    }
  });

  it("menolak minScore di luar rentang", () => {
    const res = quizSchema.safeParse({
      title: "Kuis Rambu",
      educationLevel: "SD",
      minScore: 150,
    });
    expect(res.success).toBe(false);
  });
});

describe("questionSchema", () => {
  it("menerima soal lengkap dengan kunci jawaban", () => {
    const res = questionSchema.safeParse({
      quizId: "q1",
      text: "Apa warna rambu larangan?",
      optionA: "Merah",
      optionB: "Biru",
      optionC: "Hijau",
      optionD: "Putih",
      correctOption: "A",
    });
    expect(res.success).toBe(true);
  });

  it("menerima soal tanpa kunci jawaban (draft diperbolehkan)", () => {
    const res = questionSchema.safeParse({
      quizId: "q1",
      text: "Apa warna rambu larangan?",
      optionA: "Merah",
      optionB: "Biru",
      optionC: "Hijau",
      optionD: "Putih",
    });
    expect(res.success).toBe(true);
  });
});