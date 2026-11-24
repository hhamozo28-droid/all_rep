import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { SESSION_COOKIE, destroySession, getSessionState } from "@/lib/auth";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

/**
 * Self-deletion from the app (web/PWA or mobile). The profile row is kept so
 * the admin still sees the login details in the panel, but the account is
 * deactivated: it can no longer log in (see login + getSessionState) and the
 * email cannot be registered again (see register). Only the admin can remove
 * the row permanently from the panel.
 */
export async function POST() {
  await ensureWelcomeColumn();
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false, reason: s.status }, { status: 401 });
  }
  await db
    .update(profiles)
    .set({ deletedAt: new Date() })
    .where(eq(profiles.id, s.user.id));
  await destroySession(s.user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
