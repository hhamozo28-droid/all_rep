import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { DEMO_SPECIALTIES, replaceCatalog } from "@/lib/seed";
import { rejectCrossOriginWrite } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const store = await cookies();
  if (!isAuthorizedAdmin(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const version = await replaceCatalog(DEMO_SPECIALTIES, "demo-seed");
  return NextResponse.json({ ok: true, count: DEMO_SPECIALTIES.length, version });
}
