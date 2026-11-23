import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { consumeUserDownload } from "@/lib/consumeDownload";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureGuidesTable();
  const [row] = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const ok = await consumeUserDownload(s.user.id);
  if (!ok) return NextResponse.json({ error: "download-limit" }, { status: 403 });

  await db
    .update(guides)
    .set({ downloads: sql`${guides.downloads} + 1` })
    .where(eq(guides.id, row.id));
  return NextResponse.json({ ok: true });
}
