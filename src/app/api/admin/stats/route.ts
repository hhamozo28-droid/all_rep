import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq, sql } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles, specialties, specialtyDownloads } from "@/db/schema";
import { ensureSpecialtyDownloadsTable } from "@/lib/specialtyStats";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

type TopSpecialty = { code: string; name: string; downloads: number };

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  try {
    await ensureWelcomeColumn();
    await ensureSpecialtyDownloadsTable();

    // 1. Total downloads across all accounts.
    const [totalRow] = await db
      .select({ total: sql<number>`coalesce(sum(${profiles.downloads}), 0)::int` })
      .from(profiles);

    // 2. Account counters.
    const [totalAccounts] = await db
      .select({ count: sql<number>`coalesce(count(*), 0)::int` })
      .from(profiles);
    const [blockedCount] = await db
      .select({ count: sql<number>`coalesce(count(*) FILTER (WHERE ${profiles.blocked}), 0)::int` })
      .from(profiles);
    const [exhaustedCount] = await db
      .select({ count: sql<number>`coalesce(count(*) FILTER (WHERE ${profiles.blocked} = false AND ${profiles.downloadLimit} IS NOT NULL AND ${profiles.downloads} >= ${profiles.downloadLimit}), 0)::int` })
      .from(profiles);
    const [activeCount] = await db
      .select({ count: sql<number>`coalesce(count(*) FILTER (WHERE ${profiles.blocked} = false AND (${profiles.downloadLimit} IS NULL OR ${profiles.downloads} < ${profiles.downloadLimit})), 0)::int` })
      .from(profiles);

    // 2. The specialty with the most download operations overall.
    const topSpecialtyRows = await db
      .select({
        specialtyId: specialtyDownloads.specialtyId,
        total: sql<number>`coalesce(sum(${specialtyDownloads.downloads}), 0)::int`,
      })
      .from(specialtyDownloads)
      .groupBy(specialtyDownloads.specialtyId)
      .orderBy(desc(sql`coalesce(sum(${specialtyDownloads.downloads}), 0)::int`), desc(specialtyDownloads.specialtyId))
      .limit(1);

    let topSpecialty: TopSpecialty | null = null;
    if (topSpecialtyRows[0]) {
      const spRows = await db
        .select({ code: specialties.code, name: specialties.name })
        .from(specialties)
        .where(eq(specialties.id, topSpecialtyRows[0].specialtyId))
        .limit(1);
      if (spRows[0]) {
        topSpecialty = { code: spRows[0].code, name: spRows[0].name, downloads: topSpecialtyRows[0].total };
      }
    }

    // 3. The account with the most downloads.
    const topAccountRows = await db
      .select({ email: profiles.email, downloads: profiles.downloads })
      .from(profiles)
      .orderBy(desc(profiles.downloads), desc(profiles.email))
      .limit(1);

    return NextResponse.json(
      {
        ok: true,
        total: totalRow?.total ?? 0,
        totalAccounts: totalAccounts?.count ?? 0,
        blockedCount: blockedCount?.count ?? 0,
        exhaustedCount: exhaustedCount?.count ?? 0,
        activeCount: activeCount?.count ?? 0,
        topSpecialty,
        topAccount: topAccountRows[0] ?? null,
      },
      { headers: adminResponseHeaders },
    );
  } catch (error) {
    const e = error as { message?: string; cause?: { message?: string } };
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(error), cause: e?.cause?.message ?? "" },
      { status: 500, headers: adminResponseHeaders },
    );
  }
}
