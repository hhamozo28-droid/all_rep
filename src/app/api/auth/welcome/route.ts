import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { meta, profiles } from "@/db/schema";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KEY = "welcomeMessage";
const MESSAGE_MAX = 500;

/** Self-healing DDL: applied the first time the endpoint is used. */
async function ensureWelcomeColumn(): Promise<void> {
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_shown boolean NOT NULL DEFAULT false`);
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
  const message = msgRow?.value ?? "";
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
  const message = msgRow?.value ?? "";
  const shown = profile?.welcomeShown ?? false;
  // Mark as seen once, so the message is shown at most once per account.
  if (message && !shown) {
    await db.update(profiles).set({ welcomeShown: true }).where(eq(profiles.id, s.user.id));
  }
  return NextResponse.json({ ok: true, message: message || null, shown: message ? true : shown });
}
