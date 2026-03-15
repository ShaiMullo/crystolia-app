import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const LOGIN_PATH = "/login";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Token expired or tampered — clear the stale cookie and redirect
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("from", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("auth_token");
    return res;
  }
}

export const config = {
  // Only runs on admin and agent routes.
  // Static assets, _next internals, and /api are excluded automatically.
  matcher: ["/admin/:path*", "/agent/:path*"],
};
