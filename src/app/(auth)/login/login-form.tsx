"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/app/actions/auth-actions";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export function LoginForm({ action }: { action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {state?.message && !state.success && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" placeholder="email@contoh.id" required className="pl-9" />
        </div>
        {state?.errors?.email && <p className="text-sm text-red-600">{state.errors.email}</p>}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/lupa-password" className="text-xs text-primary hover:underline">
            Lupa password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            className="pl-9 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-slate-700"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {state?.errors?.password && <p className="text-sm text-red-600">{state.errors.password}</p>}
      </div>
      <Button
        type="submit"
        className="w-full bg-linear-to-r from-blue-700 to-sky-600 text-white shadow-md shadow-blue-600/25 hover:from-blue-800 hover:to-sky-700"
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" /> Masuk
          </>
        )}
      </Button>
      <div className="relative my-4 text-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="relative bg-white px-3 text-xs uppercase tracking-wide text-muted-foreground">
          atau
        </span>
      </div>
      <Link href="/register">
        <Button type="button" variant="outline" className="w-full">
          Daftar sebagai murid
        </Button>
      </Link>
    </form>
  );
}