import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { lessonUploadChunks } from "@/db/schema";
import { ensureLessonUploadChunksTable } from "@/lib/specialtyStats";
import { CHUNK_SIZE } from "@/lib/uploadLimits";

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

  const params = new URL(request.url).searchParams;
  const sessionId = String(params.get("sessionId") ?? "").trim();
  const indexText = String(params.get("index") ?? "").trim();
  if (!UUID_RE.test(sessionId) || !/^[0-9]+$/.test(indexText)) return fail("bad-request", 400);

  const data = Buffer.from(await request.arrayBuffer());
  if (data.length === 0 || data.length > CHUNK_SIZE) return fail("file-too-big", 413);

  await ensureLessonUploadChunksTable();
  await db
    .insert(lessonUploadChunks)
    .values({ sessionId, partIndex: Number(indexText), data: data.toString("base64") })
    .onConflictDoUpdate({
      target: [lessonUploadChunks.sessionId, lessonUploadChunks.partIndex],
      set: { data: data.toString("base64") },
    });
  return NextResponse.json({ ok: true, sessionId }, { headers: adminResponseHeaders });
}
