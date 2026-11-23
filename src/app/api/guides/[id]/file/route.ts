import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { fetchGuide } from "@/lib/githubGuides";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false, reason: s.status }, { status: 401 });
  }
  await ensureGuidesTable();
  const [row] = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });

  const buffer = await fetchGuide(row.path);
  if (!buffer) return NextResponse.json({ ok: false }, { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Length": String(row.size),
    "Cache-Control": "private, no-store",
  };
  headers["Content-Disposition"] = `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(row.fileName)}`;
  return new Response(new Uint8Array(buffer), { headers });
}
