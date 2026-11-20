import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, isAdminConfigured, signAdminToken } from "@/lib/admin-auth";
import { adminRedirect, adminResponseHeaders, isFormPost, rejectCrossOriginWrite } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const form = isFormPost(request);
  if (!isAdminConfigured()) {
    return form ? adminRedirect("setup") : NextResponse.json({ error: "admin-not-configured" }, { status: 503, headers: adminResponseHeaders });
  }
  const input = form
    ? (await request.formData().catch(() => null))?.get("password")
    : (await request.json().catch(() => null))?.password;
  if (typeof input !== "string" || !checkAdminPassword(input)) {
    return form ? adminRedirect("invalid") : NextResponse.json({ error: "wrong-password" }, { status: 401, headers: adminResponseHeaders });
  }
  const response = form ? adminRedirect("verify") : NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
  response.cookies.set(ADMIN_COOKIE, signAdminToken(), adminCookieOptions(request));
  return response;
}
