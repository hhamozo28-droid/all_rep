import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionState } from "@/lib/auth";
import { isLocale } from "@/lib/locales";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { language?: string } | null;
  if (!isLocale(body?.language)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await db
    .update(profiles)
    .set({ language: body.language! })
    .where(eq(profiles.id, s.user.id));
  return NextResponse.json({ ok: true, language: body.language });
}
