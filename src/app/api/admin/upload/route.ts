import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { DocxParseError, parseDocx } from "@/lib/parseDocx";
import { replaceCatalog } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_SIZE = 15 * 1024 * 1024;
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: adminResponseHeaders });

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  if (!isAuthorizedAdmin((await cookies()).get(ADMIN_COOKIE)?.value)) return fail("unauthorized", 401);
  const form = await request.formData().catch(() => null);
  if (!form) return fail("bad-request", 400);
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) return fail("bad-file", 400);
  if (!file.size) return fail("empty-file", 400);
  if (file.size > MAX_SIZE) return fail("file-too-big", 413);

  let parsed;
  try {
    parsed = await parseDocx(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    const code = error instanceof DocxParseError ? error.code : "unreadable";
    return NextResponse.json({ error: code, code }, { status: 400, headers: adminResponseHeaders });
  }
  try {
    const version = await replaceCatalog(parsed.rows, file.name);
    return NextResponse.json({ ok: true, count: parsed.rows.length, version, warnings: parsed.warnings }, { headers: adminResponseHeaders });
  } catch {
    return fail("catalog-unavailable", 503);
  }
}
