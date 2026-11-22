import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

const ALLOWED_LIMITS = [3, 10, 20, 50, 150];

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { id?: string; limit?: number | null } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  const limit = body.limit;
  if (limit !== null && (typeof limit !== "number" || !ALLOWED_LIMITS.includes(limit))) {
    return NextResponse.json({ error: "invalid-limit" }, { status: 400, headers: adminResponseHeaders });
  }
  const updated = await db
    .update(profiles)
    .set({ downloadLimit: limit })
    .where(eq(profiles.id, body.id))
    .returning({ id: profiles.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: adminResponseHeaders });
  }
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
