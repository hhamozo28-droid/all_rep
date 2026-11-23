import { NextResponse } from "next/server";

export const adminResponseHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

/** Cookie-authenticated writes must come from this app, including inside a preview frame. */
export function rejectCrossOriginWrite(request: Request): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin") return null;
  const reject = () => NextResponse.json({ error: "forbidden" }, { status: 403, headers: adminResponseHeaders });
  if (site === "cross-site" || site === "same-site") return reject();
  const origin = request.headers.get("origin");
  if (!origin) return null; // Non-browser API clients do not send Origin.
  try {
    const source = new URL(origin);
    const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")?.split(",")[0].trim(), new URL(request.url).host];
    if (["http:", "https:"].includes(source.protocol) && hosts.includes(source.host)) return null;
  } catch { /* An opaque or malformed origin is not trusted. */ }
  return reject();
}

export const isFormPost = (request: Request) => /^(application\/x-www-form-urlencoded|multipart\/form-data)(;|$)/i.test(request.headers.get("content-type") || "");

export function adminRedirect(reason?: "verify" | "invalid" | "setup") {
  // A relative redirect preserves the public preview host behind reverse proxies.
  return new NextResponse(null, {
    status: 303,
    headers: { ...adminResponseHeaders, Location: reason ? `/admin?state=${reason}` : "/" },
  });
}
