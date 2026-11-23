import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, desc } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureGuidesTable();
  const rows = await db
    .select()
    .from(guides)
    .orderBy(desc(guides.uploadedAt), asc(guides.path));
  return NextResponse.json(
    {
      ok: true,
      guides: rows.map((g) => ({
        id: g.id,
        path: g.path,
        title: g.title,
        fileName: g.fileName,
        size: g.size,
        downloads: g.downloads,
        uploadedAt: g.uploadedAt.toISOString(),
      })),
    },
    { headers: adminResponseHeaders },
  );
}
