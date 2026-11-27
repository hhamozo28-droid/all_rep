import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { specialties } from "@/db/schema";
import { ensureSeeded, serializeSpecialty } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(specialties)
      .orderBy(asc(specialties.idx), asc(specialties.id));
    const latest = rows[0];
    return NextResponse.json({
      items: rows.map((row) => serializeSpecialty(row)),
      version: latest?.version ?? 0,
      publishedAt: latest?.publishedAt.toISOString() ?? null,
      updatedAt: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
