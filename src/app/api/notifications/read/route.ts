import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notifications";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false }, { status: 401, headers: storageHeaders });
  }
  await markNotificationsRead(s.user.id);
  return NextResponse.json({ ok: true }, { headers: storageHeaders });
}
