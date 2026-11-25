import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { specialties } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const rows = await db
    .selectDistinct({ code: specialties.code })
    .from(specialties)
    .orderBy(asc(specialties.code));
  return NextResponse.json(
    { ok: true, codes: rows.map((row) => row.code) },
    { headers: adminResponseHeaders },
  );
}
