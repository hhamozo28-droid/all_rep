import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ reason: s.status }, { status: 401 });
  }
  return NextResponse.json({
    user: { email: s.user.email, language: s.user.language },
  });
}
