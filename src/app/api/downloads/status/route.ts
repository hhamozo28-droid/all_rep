import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false, reason: s.status }, { status: 401, headers });
  }
  return NextResponse.json(
    { downloads: s.user.downloads, downloadLimit: s.user.downloadLimit },
    { headers },
  );
}
