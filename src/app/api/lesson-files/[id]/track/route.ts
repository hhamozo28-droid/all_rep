import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { lessonFiles } from "@/db/schema";
import { appOnlyGate } from "@/lib/appOnly";
import { getSessionState } from "@/lib/auth";
import { consumeUserDownload } from "@/lib/consumeDownload";
import { createGrant } from "@/lib/downloadGrants";
import { ensureLessonFilesTable } from "@/lib/specialtyStats";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: storageHeaders });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const s = await getSessionState();
  if (s.status !== "ok") return fail("unauthorized", 401);
  const blocked = await appOnlyGate(request);
  if (blocked) return blocked;
  await ensureLessonFilesTable();
  const [row] = await db.select().from(lessonFiles).where(eq(lessonFiles.id, id)).limit(1);
  if (!row) return fail("not-found", 404);

  const ok = await consumeUserDownload(s.user.id);
  if (!ok) return fail("download-limit", 403);

  await db
    .update(lessonFiles)
    .set({ downloads: sql`${lessonFiles.downloads} + 1` })
    .where(eq(lessonFiles.id, id));

  const grant = await createGrant({
    userId: s.user.id,
    kind: "lesson",
    itemId: id,
  });
  return NextResponse.json(
    { ok: true, url: grant.url, expiresAt: grant.expiresAt },
    { headers: storageHeaders },
  );
}
