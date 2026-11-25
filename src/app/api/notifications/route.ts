import { NextResponse } from "next/server";
import { getSessionState } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false }, { status: 401, headers: storageHeaders });
  }
  return NextResponse.json(
    { ok: true, notifications: await listNotifications(s.user.id) },
    { headers: storageHeaders },
  );
}
