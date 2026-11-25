import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { isNull } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  if (!host || !user || !pass) {
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

  await ensureWelcomeColumn();
  const rows = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(isNull(profiles.deletedAt));
  const emails = Array.from(new Set(rows.map((row) => row.email)));

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || user,
    to: user,
    bcc: emails,
    subject,
    text,
  });
  return NextResponse.json({ ok: true, count: emails.length }, { headers: adminResponseHeaders });
}
