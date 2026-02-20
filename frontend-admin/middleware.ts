import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // DEBUG MODE: Middleware disabled
  // Unconditional pass-through
  return NextResponse.next();
}
