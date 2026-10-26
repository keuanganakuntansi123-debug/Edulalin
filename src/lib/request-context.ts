import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Ambil metadata request (IP & user-agent) dengan aman.
 *
 * `headers()` hanya tersedia di dalam request scope Next.js. Fungsi ini
 * mengembalikan nilai kosong bila dipanggil di luar konteks tersebut (mis.
 * saat pengujian atau job terjadwal) alih-alih melempar error, sehingga
 * pencatatan audit tidak pernah menggagalkan aksi utama.
 */
export async function getRequestMeta(): Promise<RequestMeta> {
  try {
    const store = await headers();
    return {
      ipAddress: store.get("x-forwarded-for") ?? store.get("x-real-ip") ?? null,
      userAgent: store.get("user-agent") ?? null,
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Panggil `revalidatePath` tanpa risiko menggagalkan aksi utama.
 *
 * `revalidatePath` memerlukan konteks request Next.js. Di luar konteks itu
 * (mis. pada job terjadwal atau pengujian) fungsi ini menelan error-nya agar
 * perubahan data yang sudah tersimpan tidak dianggap gagal.
 */
export function safeRevalidatePath(path: string, type?: "page" | "layout"): void {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch {
    // Diabaikan dengan sengaja — lihat dokumentasi fungsi di atas.
  }
}
