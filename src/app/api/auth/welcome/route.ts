import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meta, profiles } from "@/db/schema";
import { getSessionState } from "@/lib/auth";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

const KEY = "welcomeMessage";

function fillVariables(
  text: string,
  user: { email: string; downloads: number; downloadLimit: number | null },
): string {
  const remaining = user.downloadLimit === null
    ? "غير محدود"
    : String(Math.max(0, user.downloadLimit - user.downloads));
  return text
    .replace(/\{email\}/g, user.email)
    .replace(/\{limit\}/g, remaining);
}

export async function GET() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await ensureWelcomeColumn();
  const [profile] = await db
    .select({ welcomeShown: profiles.welcomeShown })
    .from(profiles)
    .where(eq(profiles.id, s.user.id))
    .limit(1);
  const [msgRow] = await db.select().from(meta).where(eq(meta.key, KEY)).limit(1);
  const message = fillVariables(msgRow?.value ?? "", s.user);
  return NextResponse.json({ ok: true, message, shown: profile?.welcomeShown ?? false });
}

export async function POST() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await ensureWelcomeColumn();
  const [profile] = await db
    .select({ welcomeShown: profiles.welcomeShown })
    .from(profiles)
    .where(eq(profiles.id, s.user.id))
    .limit(1);
  const [msgRow] = await db.select().from(meta).where(eq(meta.key, KEY)).limit(1);
  const message = fillVariables(msgRow?.value ?? "", s.user);
  const wasShown = profile?.welcomeShown ?? false;
  // Mark as seen once, so the message is shown at most once per account.
  if (message && !wasShown) {
    await db.update(profiles).set({ welcomeShown: true }).where(eq(profiles.id, s.user.id));
  }
  return NextResponse.json({ ok: true, message: message || null, isNew: Boolean(message && !wasShown) });
}
