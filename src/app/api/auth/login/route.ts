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

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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
    if (!p || !verifyPassword(password, p.passwordHash)) {
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
