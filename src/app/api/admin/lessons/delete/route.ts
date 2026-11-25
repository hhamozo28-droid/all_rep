import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { lessonFiles } from "@/db/schema";
import { removeLessonFile } from "@/lib/lessonStorage";
import { ensureLessonFilesTable } from "@/lib/specialtyStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: adminResponseHeaders });

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) return fail("unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return fail("bad-request", 400);
  await ensureLessonFilesTable();

  const [row] = await db.select().from(lessonFiles).where(eq(lessonFiles.id, body.id)).limit(1);
  if (!row) return fail("not-found", 404);

  try {
    await removeLessonFile({ lessonId: row.id, path: row.path, sha: row.sha });
  } catch {
    return fail("internal", 500);
  }
  await db.delete(lessonFiles).where(eq(lessonFiles.id, row.id));
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
