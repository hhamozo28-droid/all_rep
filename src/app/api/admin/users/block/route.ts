import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { id?: string; blocked?: boolean } | null;
  if (!body?.id || typeof body.blocked !== "boolean") {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  await db.update(profiles).set({ blocked: body.blocked }).where(eq(profiles.id, body.id));
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
