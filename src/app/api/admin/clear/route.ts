import { NextResponse } from "next/server";
import { rejectCrossOriginWrite } from "@/lib/admin-http";
import { cookies } from "next/headers";
import { db } from "@/db";
import { meta, specialties } from "@/db/schema";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const store = await cookies();
  if (!isAuthorizedAdmin(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await db.delete(specialties);
  await db
    .insert(meta)
    .values({ key: "last_upload", value: "" })
    .onConflictDoUpdate({ target: meta.key, set: { value: "" } });
  return NextResponse.json({ ok: true });
}
