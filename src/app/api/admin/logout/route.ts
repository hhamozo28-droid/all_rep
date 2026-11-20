import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/admin-auth";
import { adminRedirect, adminResponseHeaders, isFormPost, rejectCrossOriginWrite } from "@/lib/admin-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const response = isFormPost(request) ? adminRedirect() : NextResponse.json({ ok: true }, { headers: adminResponseHeaders });
  // A partitioned session must be cleared using the same cookie attributes.
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(request), maxAge: 0, expires: new Date(0) });
  return response;
}
