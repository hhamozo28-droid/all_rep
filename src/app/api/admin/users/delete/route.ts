import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { deletedAccounts, profiles } from "@/db/schema";
import { ensureDeletedAccountsTable } from "@/lib/accountDeletion";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  const target = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, body.id))
    .limit(1);
  if (!target[0]) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: adminResponseHeaders });
  }
  // Keep the email forever so it cannot be registered again.
  await ensureDeletedAccountsTable();
  await db
    .insert(deletedAccounts)
    .values({ email: target[0].email })
    .onConflictDoNothing();
  const deleted = await db
    .delete(profiles)
    .where(eq(profiles.id, body.id))
    .returning({ id: profiles.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: adminResponseHeaders });
  }
  // Sessions are removed too: userSessions.userId is a foreign key to
  // profiles.id with onDelete: "cascade" (see src/db/schema.ts).
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
