import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { meta } from "@/db/schema";

export const dynamic = "force-dynamic";

export const THEMES = ["default", "white-black", "red-purple", "brown-shiny"] as const;
export type Theme = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is Theme {
  return value !== undefined && (THEMES as readonly string[]).includes(value);
}

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const rows = await db.select().from(meta).where(eq(meta.key, "theme")).limit(1);
  return NextResponse.json({ ok: true, theme: isTheme(rows[0]?.value) ? rows[0].value : "default" }, { headers: adminResponseHeaders });
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  const body = (await request.json().catch(() => null)) as { theme?: string } | null;
  const theme = body?.theme;
  if (!isTheme(theme)) {
    return NextResponse.json({ error: "invalid-theme" }, { status: 400, headers: adminResponseHeaders });
  }
  await db
    .insert(meta)
    .values({ key: "theme", value: theme })
    .onConflictDoUpdate({ target: meta.key, set: { value: theme } });
  return NextResponse.json({ ok: true, theme }, { headers: adminResponseHeaders });
}
