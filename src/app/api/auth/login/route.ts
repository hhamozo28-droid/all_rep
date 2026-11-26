import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { isLocale } from "@/lib/locales";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureWelcomeColumn();
    const body = (await req.json().catch(() => null)) as {
      email?: string;
      password?: string;
      deviceId?: string;
      language?: string;
    } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const profs = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    const p = profs[0];
    if (p?.deletedAt) {
      return NextResponse.json({ error: "account-deleted" }, { status: 401 });
    }
    if (p?.blocked) {
      return NextResponse.json({ error: "blocked" }, { status: 401 });
    }
    if (p && !p.approved) {
      return NextResponse.json({ error: "pending-approval" }, { status: 401 });
    }
    if (!p) {
      return NextResponse.json({ error: "account-not-found" }, { status: 401 });
    }
    if (!verifyPassword(password, p.passwordHash)) {
      return NextResponse.json({ error: "bad-credentials" }, { status: 401 });
    }

    const language = isLocale(body?.language) ? body.language! : p.language;
    if (language !== p.language) {
      await db
        .update(profiles)
        .set({ language })
        .where(eq(profiles.id, p.id));
    }

    const token = await createSession(p.id, String(body?.deviceId || "unknown"));
    const res = NextResponse.json({
      ok: true,
      user: { email: p.email, language },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
