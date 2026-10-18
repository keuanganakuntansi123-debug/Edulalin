"use server";

import { login, logout, register } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthActionState = {
  errors?: Record<string, string>;
  message?: string;
  success?: boolean;
} | undefined;

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const result = await login({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.success) {
    return { errors: result.errors, message: result.message, success: false };
  }
  redirect(result.data.redirectTo);
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const result = await register({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    birthDate: formData.get("birthDate") ? new Date(String(formData.get("birthDate"))) : new Date(),
    schoolName: String(formData.get("schoolName") ?? ""),
    educationLevel: String(formData.get("educationLevel") ?? ""),
    classLevel: String(formData.get("classLevel") ?? ""),
    major: String(formData.get("major") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!result.success) {
    return { errors: result.errors, message: result.message, success: false };
  }
  redirect(result.data.redirectTo);
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

export async function revalidateDashboard() {
  revalidatePath("/dashboard", "layout");
}