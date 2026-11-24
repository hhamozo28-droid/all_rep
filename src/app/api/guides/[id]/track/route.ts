import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { consumeUserDownload } from "@/lib/consumeDownload";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { createGrant } from "@/lib/downloadGrants";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { getSessionState } from "@/lib/auth";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: storageHeaders });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSessionState();
  if (s.status !== "ok") return fail("unauthorized", 401);
  await ensureGuidesTable();
  const [row] = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!row) return fail("not-found", 404);

  const body = (await request.json().catch(() => null)) as { mode?: string } | null;
  const mode = body?.mode === "download" ? "download" : "open";

  const ok = await consumeUserDownload(s.user.id);
  if (!ok) return fail("download-limit", 403);

  await db
    .update(guides)
    .set({ downloads: sql`${guides.downloads} + 1` })
    .where(eq(guides.id, id));

  const grant = await createGrant({
    userId: s.user.id,
    kind: "guide",
    itemId: id,
    mode,
  });
  return NextResponse.json(
    { ok: true, url: grant.url, expiresAt: grant.expiresAt },
    { headers: storageHeaders },
  );
}
