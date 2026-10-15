import { NextRequest, NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/session-token";
import { dashboardPath } from "@/lib/constants";

// Route publik yang tidak memerlukan autentikasi.
const PUBLIC_PATHS = [
  "/",
  "/tentang",
  "/kontak",
  "/login",
  "/register",
  "/lupa-password",
  "/faq",
];

// Route yang hanya boleh diakses role tertentu (dict role -> prefix).
const ROLE_PREFIX: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  GURU: "/dashboard/guru",
  POLISI: "/dashboard/polisi",
  MURID: "/dashboard/murid",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = await getSessionPayload();

  // Halaman dashboard butuh login
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const role = session.role;
    const allowedPrefix = ROLE_PREFIX[role];
    const sharedPages = ["/dashboard/profil", "/dashboard/settings"];
    const isSharedPage = sharedPages.some((p) => pathname.startsWith(p));
    if (!isSharedPage && (!allowedPrefix || !pathname.startsWith(allowedPrefix))) {
      return NextResponse.redirect(new URL(dashboardPath(role), request.url));
    }
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  // Halaman publik di-allow
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};