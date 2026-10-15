import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  getSessionPayload,
  type SessionPayload,
} from "@/lib/session-token";

export {
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  getSessionPayload,
  type SessionPayload,
};

/** Ambil user aktif lengkap dari session (termasuk relasi sekolah). */
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = await prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null },
    include: { school: true },
  });
  if (!user || user.status === "INACTIVE") return null;
  // Sekolah yang nonaktif / terhapus otomatis mencabut akses user.
  if (
    user.school &&
    (user.school.status === "INACTIVE" || user.school.deletedAt !== null)
  ) {
    return null;
  }
  return user;
}
