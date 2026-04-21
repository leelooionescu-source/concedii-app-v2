import { NextRequest, NextResponse } from "next/server";
import { isValidToken, AUTH_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/push/notify-daily", "/manifest.json", "/sw.js"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!isValidToken(token)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|preview-angajati.html).*)"],
};
