"use client";

import { useRef, useState, useTransition } from "react";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !email || !subject || !message) {
      toast({ title: "Lengkapi formulir", description: "Semua kolom wajib diisi.", variant: "error" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email tidak valid", description: "Periksa kembali alamat email Anda.", variant: "error" });
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Gagal mengirim", description: data.error ?? "Terjadi kesalahan.", variant: "error" });
        return;
      }
      setSent(true);
      formRef.current?.reset();
      toast({ title: "Pesan terkirim", description: "Terima kasih, pesan Anda telah kami terima.", variant: "success" });
    });
  };

  return (
    <form ref={formRef} action={submit} className="mt-6 space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="contact-name">Nama Lengkap</Label>
        <Input id="contact-name" name="name" placeholder="Nama lengkap Anda" required autoComplete="name" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" name="email" type="email" placeholder="email@contoh.id" required autoComplete="email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-subject">Subjek Pesan</Label>
        <Input id="contact-subject" name="subject" placeholder="Subjek pesan" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contact-message">Isi Pesan</Label>
        <Textarea id="contact-message" name="message" rows={5} placeholder="Tulis pesan Anda..." required />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "Mengirim..." : "Kirim Pesan"}
        </Button>
        {sent && <span className="text-sm font-medium text-emerald-600">✓ Pesan berhasil dikirim</span>}
      </div>
    </form>
  );
}
