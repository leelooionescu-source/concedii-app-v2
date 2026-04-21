import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, makeToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { user, pass } = await request.json();

  if (!checkCredentials(user || "", pass || "")) {
    return NextResponse.json({ ok: false, error: "Utilizator sau parola incorecte" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
