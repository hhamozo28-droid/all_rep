import { NextResponse } from "next/server";
import { consumeUserDownload } from "@/lib/consumeDownload";
import { recordSpecialtyDownload } from "@/lib/specialtyStats";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { specialtyId?: string } | null;
    const s = await getSessionState();
    if (s.status !== "ok") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const specialtyId = typeof body?.specialtyId === "string" && body.specialtyId ? body.specialtyId : undefined;
    const ok = await consumeUserDownload(s.user.id);
    if (!ok) return NextResponse.json({ error: "download-limit" }, { status: 403 });
    if (specialtyId) {
      await recordSpecialtyDownload(s.user.id, specialtyId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

