import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { isEmailConfigured, sendBroadcastEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "email-not-configured" },
      { status: 503, headers: adminResponseHeaders },
    );
  }
  const body = (await request.json().catch(() => null)) as { subject?: string; text?: string } | null;
  const subject = String(body?.subject ?? "").trim().slice(0, 200);
  const text = String(body?.text ?? "").trim().slice(0, 5000);
  if (!subject || !text) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  const count = await sendBroadcastEmail(subject, text);
  return NextResponse.json({ ok: true, count }, { headers: adminResponseHeaders });
}
