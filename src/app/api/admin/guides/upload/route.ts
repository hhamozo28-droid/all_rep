import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { isPdfFile, uploadGuide } from "@/lib/githubGuides";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
    return fail("bad-file", 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isPdfFile(file.name, buffer)) return fail("bad-file", 400);
  if (buffer.length > 15 * 1024 * 1024) return fail("file-too-big", 413);

  try {
    await ensureGuidesTable();
    const uploaded = await uploadGuide(file.name, buffer);
    const [row] = await db
      .insert(guides)
      .values({
        path: uploaded.path,
        sha: uploaded.sha,
        size: uploaded.size,
        title: uploaded.fileName.replace(/\.pdf$/i, ""),
        fileName: uploaded.fileName,
      })
      .returning();
    if (!row) return fail("internal", 500);
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
  } catch {
    return fail("internal", 500);
  }
}
