import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from 'jose';

// We need the secret to verify the token. 
// In Next.js middleware (Edge), we must use 'jose' or similar.
// Ensure JWT_SECRET is in .env.local for frontend-admin
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-key-change-in-prod'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Ignore public files and API routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Auth Guard
  const token = req.cookies.get("token")?.value;

  // Scenario A: No Token
  if (!token) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/agent") || pathname === "/") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Scenario B: Has Token - Verify & Check Role
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // 1. Block Customers completely
    if (role === 'customer') {
      // Redirect customers back to the public site or show 403
      // Since we are creating strict separation, we redirect them to the public login
      return NextResponse.redirect(new URL("http://localhost:3000/en/auth", req.url));
    }

    // 2. Admin Route Protection
    if (pathname.startsWith("/admin") && role !== 'admin') {
      return NextResponse.redirect(new URL("/agent", req.url)); // Fallback or Error
    }

    // 3. Agent Route Protection
    if (pathname.startsWith("/agent") && role !== 'agent' && role !== 'admin') {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // 4. Redirect allowed users away from /login
    if (pathname === "/login" || pathname === "/") {
      if (role === 'admin') return NextResponse.redirect(new URL("/admin", req.url));
      if (role === 'agent') return NextResponse.redirect(new URL("/agent", req.url));
    }

  } catch (err) {
    // Invalid token
    console.error("Middleware Auth Error:", err);
    // Clear cookie (best effort) and redirect
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    return response;
  }

  return NextResponse.next();
}
