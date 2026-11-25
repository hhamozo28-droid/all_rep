import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deletedAccounts, profiles } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";
import { ensureDeletedAccountsTable } from "@/lib/accountDeletion";
import { isLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Public self-registration creates a *pending* account. No session is issued;
 * the administrator must approve it from /admin before it can sign in.
 */
export async function POST(req: Request) {
  try {
    await ensureWelcomeColumn();
    const body = (await req.json().catch(() => null)) as {
      email?: string;
      password?: string;
      language?: string;
    } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const language = isLocale(body?.language) ? body.language! : "ar";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid-email" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "password-min" }, { status: 400 });
    }

    const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "email-exists" }, { status: 409 });
    }
    await ensureDeletedAccountsTable();
    const tombstone = await db.select({ email: deletedAccounts.email }).from(deletedAccounts).where(eq(deletedAccounts.email, email)).limit(1);
    if (tombstone.length > 0) {
      return NextResponse.json({ error: "email-exists" }, { status: 409 });
    }

    await db.insert(profiles).values({
      email,
      passwordHash: hashPassword(password),
      plainPassword: password,
      language,
      approved: false,
    });
    return NextResponse.json({ ok: true, pending: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
