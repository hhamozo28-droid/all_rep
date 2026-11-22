import { NextResponse } from "next/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
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
    // Atomic: the increment only happens when the account has not reached
    // its limit (download_limit IS NULL means unlimited). Concurrent clicks
    // cannot over-count.
    const [row] = await db
      .update(profiles)
      .set({ downloads: sql`${profiles.downloads} + 1` })
      .where(
        and(
          or(isNull(profiles.downloadLimit), lt(profiles.downloads, profiles.downloadLimit)),
          eq(profiles.id, s.user.id),
        ),
      )
      .returning({ downloads: profiles.downloads, downloadLimit: profiles.downloadLimit });
    if (!row) {
      return NextResponse.json({ ok: false, error: "download-limit" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, downloads: row.downloads, downloadLimit: row.downloadLimit });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
