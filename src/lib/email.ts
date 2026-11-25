import nodemailer from "nodemailer";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASSWORD?.trim(),
  );
}

function transporter() {
  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || 587);
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASSWORD!.trim();
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function from(): string {
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim();
}

/** One email to the admin with every active account in BCC. */
export async function sendBroadcastEmail(subject: string, text: string): Promise<number> {
  await ensureWelcomeColumn();
  const rows = await db.select({ email: profiles.email }).from(profiles).where(isNull(profiles.deletedAt));
  const emails = Array.from(new Set(rows.map((row) => row.email)));
  await transporter().sendMail({
    from: from(),
    to: process.env.SMTP_USER!.trim(),
    bcc: emails,
    subject,
    text,
  });
  return emails.length;
}

/** Email a single account (used with per-user balance increases). */
export async function sendUserEmail(email: string, subject: string, text: string): Promise<void> {
  await transporter().sendMail({
    from: from(),
    to: email,
    subject,
    text,
  });
}
