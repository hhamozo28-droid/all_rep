import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import {
  SESSION_COOKIE,
  createSession,
  hashPassword,
  sessionCookieOptions,
} from "@/lib/auth";
import { isLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "password-min" }, { status: 400 });
    }

    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "email-exists" }, { status: 409 });
    }

    const language = isLocale(body?.language) ? body.language! : "ar";
    const [created] = await db
      .insert(profiles)
      .values({ email, passwordHash: hashPassword(password), language })
      .returning({ id: profiles.id, email: profiles.email, language: profiles.language });

    const token = await createSession(created.id, String(body?.deviceId || "unknown"));
    const res = NextResponse.json({
      ok: true,
      user: { email: created.email, language: created.language },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
