import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const rows = await db
    .select()
    .from(profiles)
    .orderBy(desc(profiles.createdAt), desc(profiles.email));
  return NextResponse.json(rows, { headers: adminResponseHeaders });
}
