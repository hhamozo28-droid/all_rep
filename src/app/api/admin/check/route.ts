import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin, usingDefaultAdminPassword } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { getCatalogInfo } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false, usingDefaultAdminPassword: usingDefaultAdminPassword() }, { status: 401, headers: adminResponseHeaders });
  }
  try {
    return NextResponse.json({ ok: true, ...await getCatalogInfo() }, { headers: adminResponseHeaders });
  } catch {
    // A catalog outage does not invalidate a verified administrator session.
    return NextResponse.json({ error: "catalog-unavailable" }, { status: 503, headers: adminResponseHeaders });
  }
}
