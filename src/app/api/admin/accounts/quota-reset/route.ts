import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

/** Set every account's download limit to the value chosen by the admin. */
export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const body = (await request.json().catch(() => null)) as { limit?: number } | null;
  const limit = body?.limit === undefined ? 6 : Number(body.limit);
  if (!Number.isInteger(limit) || limit < 0 || limit > 1000) {
    return NextResponse.json({ error: "invalid-limit" }, { status: 400, headers: adminResponseHeaders });
  }
  const updated = await db
    .update(profiles)
    .set({ downloadLimit: limit })
    .where(sql`${profiles.downloadLimit} IS DISTINCT FROM ${limit}`)
    .returning({ id: profiles.id });
  return NextResponse.json({ ok: true, affected: updated.length, limit }, { headers: adminResponseHeaders });
}
