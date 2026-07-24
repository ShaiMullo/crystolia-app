import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/; // ignore files like /favicon.ico

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore public files, API routes, and Next.js internal routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // אם אין locale — ננתב לברירת מחדל 'he'
  // Hebrew is the business's primary language and the app-wide fallback
  // (dashboard translations, logout, OAuth error paths all default to he).
  const locale = pathname.split("/")[1];

  const supportedLocales = ["en", "he", "ru"];

  if (!supportedLocales.includes(locale)) {
    return NextResponse.redirect(new URL(`/he${pathname}`, req.url));
  }

  // Redirect /login to /auth
  if (pathname.endsWith("/login")) {
    const newPath = pathname.replace("/login", "/auth");
    return NextResponse.redirect(new URL(newPath, req.url));
  }

  return NextResponse.next();
}
