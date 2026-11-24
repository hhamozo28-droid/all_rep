import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { specialties } from "@/db/schema";
import { serializeSpecialty } from "@/lib/seed";
import { getSessionState } from "@/lib/auth";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: storageHeaders });
  }
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: storageHeaders });
  }
  const rows = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, id))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: storageHeaders });
  }
  return NextResponse.json(serializeSpecialty(rows[0]), { headers: storageHeaders });
}
