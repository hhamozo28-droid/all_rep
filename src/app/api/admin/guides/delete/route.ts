import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { deleteGuide } from "@/lib/githubGuides";

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
  const id = body?.id;
  if (!id) return fail("bad-request", 400);
  await ensureGuidesTable();

  const [row] = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!row) return fail("not-found", 404);

  try {
    await deleteGuide(row.path, row.sha);
  } catch {
    return fail("internal", 500);
  }
  await db.delete(guides).where(eq(guides.id, row.id));
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
