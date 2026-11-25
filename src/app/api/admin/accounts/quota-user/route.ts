import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";
import { createNotification } from "@/lib/notifications";
import { isEmailConfigured, sendUserEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { id?: string; amount?: number; sendEmail?: boolean } | null;
  const amount = Number(body?.amount);
  if (!body?.id || !Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: "bad-request" }, { status: 400, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const updated = await db
    .update(profiles)
    .set({ downloadLimit: sql`COALESCE(${profiles.downloadLimit}, 0) + ${amount}` })
    .where(eq(profiles.id, body.id))
    .returning({ id: profiles.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "not-found" }, { status: 404, headers: adminResponseHeaders });
  }
  await createNotification(`تمت إضافة ${amount} تحميلاً إضافياً إلى حسابك`, body.id);
  if (body.sendEmail && isEmailConfigured()) {
    const [target] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, body.id)).limit(1);
    if (target) {
      await sendUserEmail(
        target.email,
        "زيادة رصيد التحميل — منصة دروسي",
        `أضيف ${amount} تحميلاً إلى رصيد حسابك على منصة دروسي.`,
      );
    }
  }
  return NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
}
