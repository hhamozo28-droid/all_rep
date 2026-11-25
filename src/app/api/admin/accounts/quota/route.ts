import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, isNull, sql } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";
import { createNotification } from "@/lib/notifications";
import { isEmailConfigured, sendBroadcastEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { amount?: number; sendEmail?: boolean } | null;
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const updated = await db
    .update(profiles)
    .set({ downloadLimit: sql`${profiles.downloadLimit} + ${amount}` })
    .where(and(isNull(profiles.deletedAt), sql`${profiles.downloadLimit} IS NOT NULL`))
    .returning({ id: profiles.id });
  await createNotification(`تمت زيادة رصيد التحميل بمقدار ${amount}`);
  if (body?.sendEmail && isEmailConfigured()) {
    await sendBroadcastEmail(
      "زيادة رصيد التحميل — منصة دروسي",
      `أضيف ${amount} تحميلاً إلى رصيد حسابك على منصة دروسي.`,
    );
  }
  return NextResponse.json({ ok: true, affected: updated.length }, { headers: adminResponseHeaders });
}
