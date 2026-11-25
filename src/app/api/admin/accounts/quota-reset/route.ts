import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

/** Set every account's download balance to 3 (admin can still increase it). */
export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const updated = await db
    .update(profiles)
    .set({ downloadLimit: 6 })
    .where(sql`${profiles.downloadLimit} IS DISTINCT FROM 3`)
    .returning({ id: profiles.id });
  return NextResponse.json({ ok: true, affected: updated.length }, { headers: adminResponseHeaders });
}
