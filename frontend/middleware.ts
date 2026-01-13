import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/; // ignore files like /favicon.ico

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore public files, API routes, and Next.js internal routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // אם אין locale — ננתב לברירת מחדל 'en'
  const locale = pathname.split("/")[1];

  const supportedLocales = ["en", "he", "ru"];

  if (!supportedLocales.includes(locale)) {
    return NextResponse.redirect(new URL(`/en${pathname}`, req.url));
  }

  return NextResponse.next();
}
