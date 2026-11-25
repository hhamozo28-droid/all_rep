import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { lessonUploadChunks } from "@/db/schema";
import { persistLessonFile } from "@/lib/lessonAdmin";
import { ensureLessonUploadChunksTable } from "@/lib/specialtyStats";
import { MAX_LESSON_FILE_BYTES } from "@/lib/uploadLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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
    specialtyCode?: string;
  } | null;
  const sessionId = String(body?.sessionId ?? "").trim();
  const fileName = String(body?.fileName ?? "").trim();
  const specialtyCode = String(body?.specialtyCode ?? "").trim();
  if (
    !UUID_RE.test(sessionId) ||
    !/\.(pdf|docx)$/i.test(fileName) ||
    !specialtyCode
  ) {
    return fail("bad-request", 400);
  }

  await ensureLessonUploadChunksTable();
  const rows = await db
    .select()
    .from(lessonUploadChunks)
    .where(eq(lessonUploadChunks.sessionId, sessionId))
    .orderBy(asc(lessonUploadChunks.partIndex));
  if (rows.length === 0) return fail("bad-request", 400);

  const buffer = Buffer.concat(rows.map((row) => Buffer.from(row.data, "base64")));
  const clearSession = () =>
    db.delete(lessonUploadChunks).where(eq(lessonUploadChunks.sessionId, sessionId));

  if (buffer.length > MAX_LESSON_FILE_BYTES) {
    await clearSession();
    return fail("file-too-big", 413);
  }

  try {
    await clearSession();
    const row = await persistLessonFile({ specialtyCode, name: fileName, buffer });
    return NextResponse.json(
      {
        ok: true,
        id: row.id,
        specialtyCode: row.specialtyCode,
        path: row.path,
        name: row.title,
        size: row.size,
        uploadedAt: row.uploadedAt.toISOString(),
      },
      { headers: adminResponseHeaders },
    );
  } catch (error) {
    console.error("lesson upload failed", error);
    return fail("internal", 500);
  }
}
