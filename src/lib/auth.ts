import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, userSessions } from "@/db/schema";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const SESSION_COOKIE = "dl_session";

const DEV_SESSION_SECRET = "dl-dev-session-secret";

const secret = () => {
  const configured = process.env.SESSION_SECRET?.trim();

  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return DEV_SESSION_SECRET;
};
const b64u = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export function signSession(userId: string, deviceId: string): string {
  const payload = `${b64u(userId)}.${b64u(deviceId)}`;
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(
  value: string | undefined,
): { userId: string; deviceId: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [u, d, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${u}.${d}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return { userId: fromB64u(u), deviceId: fromB64u(d) };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `s2:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [v, salt, hash] = stored.split(":");
    if (v !== "s2" || !salt || !hash) return false;
    const check = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      check.length === expected.length && crypto.timingSafeEqual(check, expected)
    );
  } catch {
    return false;
  }
}

export type PublicUser = {
  id: string;
  email: string;
  language: string;
  downloads: number;
  downloadLimit: number | null;
};
export type SessionState =
  | { status: "ok"; user: PublicUser }
  | { status: "other-device" }
  | { status: "none" };

/**
 * Resolve the current session.
 * - "other-device": cookie signature is valid but the stored session row
 *   holds a different token → the account was signed in elsewhere (kick).
 */
export async function getSessionState(): Promise<SessionState> {
  await ensureWelcomeColumn();
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  const claimed = verifySession(value);
  if (!claimed) return { status: "none" };

  const profs = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, claimed.userId))
    .limit(1);
  const p = profs[0];
  if (!p) return { status: "none" };
  if (p.deletedAt || p.blocked || !p.approved) return { status: "none" };

  const rows = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.userId, p.id))
    .limit(1);
  const row = rows[0];
  if (!row) return { status: "none" };
  if (row.token !== value) return { status: "other-device" };

  return {
    status: "ok",
    user: { id: p.id, email: p.email, language: p.language, downloads: p.downloads, downloadLimit: p.downloadLimit },
  };
}

/** Single-session: a new login overwrites the row (token + device), kicking the previous device. */
export async function createSession(
  userId: string,
  deviceId: string,
): Promise<string> {
  const value = signSession(userId, deviceId);
  const now = new Date();
  await db
    .insert(userSessions)
    .values({ userId, token: value, deviceId, updatedAt: now })
    .onConflictDoUpdate({
      target: userSessions.userId,
      set: { token: value, deviceId, updatedAt: now },
    });
  return value;
}

export async function destroySession(userId: string): Promise<void> {
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
