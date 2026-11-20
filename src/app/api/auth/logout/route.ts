import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession, getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const s = await getSessionState();
  if (s.status === "ok") {
    await destroySession(s.user.id);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
