import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { lookup, resolveMx } from "node:dns/promises";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { deletedAccounts, profiles } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { ensureDeletedAccountsTable } from "@/lib/accountDeletion";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function isRealEmailDomain(domain: string): Promise<boolean> {
  try {
    await resolveMx(domain);
    return true;
  } catch {
    // Some real domains lack MX records — fall back to a hostname lookup.
    try {
      await lookup(domain, { all: true });
      return true;
    } catch {
      return false;
    }
  }
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid-email" }, { status: 400, headers: adminResponseHeaders });
  }
  const domain = email.slice(email.indexOf("@") + 1);
  if (!(await isRealEmailDomain(domain))) {
    return NextResponse.json({ error: "email-not-real" }, { status: 400, headers: adminResponseHeaders });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password-min" }, { status: 400, headers: adminResponseHeaders });
  }
  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "email-exists" }, { status: 409, headers: adminResponseHeaders });
  }
  // A permanently deleted email must never be registered again, even by an admin.
  await ensureDeletedAccountsTable();
  const tombstone = await db
    .select({ email: deletedAccounts.email })
    .from(deletedAccounts)
    .where(eq(deletedAccounts.email, email))
    .limit(1);
  if (tombstone.length > 0) {
    return NextResponse.json({ error: "email-exists" }, { status: 409, headers: adminResponseHeaders });
  }
  await db.insert(profiles).values({
    email,
    passwordHash: hashPassword(password),
    plainPassword: password,
  });
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
