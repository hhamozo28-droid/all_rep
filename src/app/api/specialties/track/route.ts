import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const s = await getSessionState();
    if (s.status !== "ok") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    await db
      .update(profiles)
      .set({ downloads: sql`${profiles.downloads} + 1` })
      .where(eq(profiles.id, s.user.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
