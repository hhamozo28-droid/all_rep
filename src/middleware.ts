import { NextResponse, type NextRequest } from "next/server";

const base = (process.env.LESSONS_PUBLIC_BASE || "").replace(/\/$/, "");

export function middleware(request: NextRequest) {
  if (!base) return NextResponse.next();
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (parts[0] !== "lessons" || parts.length < 3) return NextResponse.next();
  const code = parts[1].toLowerCase();
  const rest = parts.slice(2).map(p => encodeURIComponent(p)).join("/");
  const target = `${base}/${encodeURIComponent(code)}/${rest}`;
  return NextResponse.rewrite(new URL(target, request.url));
}

export const config = { matcher: "/lessons/:path*" };
