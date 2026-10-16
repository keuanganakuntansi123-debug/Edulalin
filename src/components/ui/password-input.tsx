"use client";

import { useState } from "react";
import { Input } from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Input password dengan ikon mata untuk menampilkan/menyembunyikan teks.
 * Berfungsi di desktop & mobile (tombol cukup besar, memakai aria-label).
 */
export function PasswordInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        type={visible ? "text" : "password"}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-slate-700"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
