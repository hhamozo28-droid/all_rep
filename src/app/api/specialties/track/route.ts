import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { recordSpecialtyDownload } from "@/lib/specialtyStats";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { specialtyId?: string } | null;
    const s = await getSessionState();
    if (s.status !== "ok") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const specialtyId = typeof body?.specialtyId === "string" && body.specialtyId ? body.specialtyId : undefined;
    await db
      .update(profiles)
      .set({ downloads: sql`${profiles.downloads} + 1` })
      .where(eq(profiles.id, s.user.id));
    await recordSpecialtyDownload(s.user.id, specialtyId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
