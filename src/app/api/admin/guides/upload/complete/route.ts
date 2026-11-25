import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { guides, guideUploadChunks } from "@/db/schema";
import { ensureGuidesTable, ensureGuideUploadChunksTable } from "@/lib/specialtyStats";
import { isGuideFile } from "@/lib/githubGuides";
import { registerHostedGuide, storeGuideFile } from "@/lib/guideStorage";
import { MAX_GUIDE_FILE_BYTES } from "@/lib/uploadLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: adminResponseHeaders });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) return fail("unauthorized", 401);

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    fileName?: string;
  } | null;
  const sessionId = String(body?.sessionId ?? "").trim();
  const fileName = String(body?.fileName ?? "").trim();
  if (!UUID_RE.test(sessionId) || !/\.(pdf|docx)$/i.test(fileName)) {
    return fail("bad-request", 400);
  }

  await ensureGuideUploadChunksTable();
  const rows = await db
    .select()
    .from(guideUploadChunks)
    .where(eq(guideUploadChunks.sessionId, sessionId))
    .orderBy(asc(guideUploadChunks.partIndex));
  if (rows.length === 0) return fail("bad-request", 400);

  const buffer = Buffer.concat(rows.map((row) => Buffer.from(row.data, "base64")));
  const clearSession = () =>
    db.delete(guideUploadChunks).where(eq(guideUploadChunks.sessionId, sessionId));

  if (buffer.length > MAX_GUIDE_FILE_BYTES) {
    await clearSession();
    return fail("file-too-big", 413);
  }
  if (!isGuideFile(fileName, buffer)) {
    await clearSession();
    return fail("bad-file", 400);
  }

  try {
    await clearSession();
    await ensureGuidesTable();
    const stored = await storeGuideFile(fileName, buffer);
    const [row] = await db
      .insert(guides)
      .values({
        path: stored.path,
        sha: stored.sha,
        size: stored.size,
        title: stored.fileName.replace(/\.(pdf|docx)$/i, ""),
        fileName: stored.fileName,
      })
      .returning();
    if (!row) return fail("internal", 500);
    if (stored.storage === "s3") {
      await registerHostedGuide({
        guideId: row.id,
        objectKey: stored.path,
        size: stored.size,
        sha: stored.sha,
        fileName: stored.fileName,
      });
    }
    return NextResponse.json(
      {
        ok: true,
        id: row.id,
        path: row.path,
        name: row.title,
        size: row.size,
        uploadedAt: row.uploadedAt.toISOString(),
      },
      { headers: adminResponseHeaders },
    );
  } catch (error) {
    console.error("guides upload failed", error);
    return fail("internal", 500);
  }
}
