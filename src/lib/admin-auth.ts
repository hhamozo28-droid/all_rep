import crypto from "node:crypto";

export const ADMIN_COOKIE = "dl_admin";
const TTL_SECONDS = 30 * 60;

// Demo access is opt-in in the sandbox environment, never a production fallback.
const demoPassword = () => process.env.VERCEL_ENV === "production" ? undefined : process.env.ADMIN_DEMO_PASSWORD;
const password = () => process.env.ADMIN_PASSWORD || demoPassword();
export const isAdminConfigured = () => Boolean(password());
export const usingDefaultAdminPassword = () => !process.env.ADMIN_PASSWORD && demoPassword() === "admin123";

export function checkAdminPassword(input: string): boolean {
  const expected = password();
  if (!expected || !input) return false;
  const digest = (s: string) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(digest(input), digest(expected));
}

function signature(expiration: string): string {
  const key = process.env.ADMIN_SECRET || password();
  if (!key) throw new Error("Admin access is not configured");
  return crypto.createHmac("sha256", key).update(`dl-admin-v2:${expiration}`).digest("base64url");
}

export function signAdminToken(): string {
  const expiration = String(Date.now() + TTL_SECONDS * 1000);
  return `${expiration}.${signature(expiration)}`;
}

export function isAuthorizedAdmin(token: string | undefined): boolean {
  if (!isAdminConfigured() || !token) return false;
  const match = /^(\d{13})\.([\w-]{43})$/.exec(token);
  if (!match || Number(match[1]) <= Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature(match[1])));
}

export function adminCookieOptions(request: Request) {
  // The hosted preview terminates TLS before forwarding to the local Next server.
  const secure = process.env.COOKIE_SECURE === "1" || new URL(request.url).protocol === "https:"
    || request.headers.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase() === "https"
    || request.headers.get("origin")?.startsWith("https://") === true;
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" as const : "lax" as const,
    partitioned: secure,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}
