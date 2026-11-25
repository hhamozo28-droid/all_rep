import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { persistLessonFile } from "@/lib/lessonAdmin";
import { validateLessonFile } from "@/lib/lessonStorage";
import { MAX_DIRECT_UPLOAD, MAX_LESSON_FILE_BYTES } from "@/lib/uploadLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: adminResponseHeaders });

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) return fail("unauthorized", 401);

  const form = await request.formData().catch(() => null);
  if (!form) return fail("bad-request", 400);
  const file = form.get("file");
  const specialtyCode = String(form.get("specialtyCode") ?? "").trim();
  if (
    !(file instanceof File) ||
    !specialtyCode ||
    !/\.(pdf|docx)$/i.test(file.name)
  ) {
    return fail("bad-file", 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateLessonFile(file.name, buffer)) return fail("bad-file", 400);
  if (buffer.length > MAX_LESSON_FILE_BYTES) return fail("file-too-big", 413);
  if (buffer.length > MAX_DIRECT_UPLOAD) return fail("file-too-big", 413);

  try {
    const row = await persistLessonFile({ specialtyCode, name: file.name, buffer });
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
