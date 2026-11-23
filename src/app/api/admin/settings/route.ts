import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { meta } from "@/db/schema";
import { FONT_STYLES, THEMES, isFontStyle, isTheme } from "@/lib/appSettings";
import { ensureWelcomeColumn } from "@/lib/ensureWelcomeColumn";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const [themeRow, fontRow, msgRow] = await Promise.all([
    db.select().from(meta).where(eq(meta.key, "theme")).limit(1),
    db.select().from(meta).where(eq(meta.key, "fontStyle")).limit(1),
    db.select().from(meta).where(eq(meta.key, "welcomeMessage")).limit(1),
  ]);
  return NextResponse.json(
    {
      ok: true,
      theme: isTheme(themeRow[0]?.value) ? themeRow[0].value : "default",
      fontStyle: isFontStyle(fontRow[0]?.value) ? fontRow[0].value : "default",
      welcomeMessage: msgRow[0]?.value ?? "",
    },
    { headers: adminResponseHeaders },
  );
}

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureWelcomeColumn();
  const body = (await request.json().catch(() => null)) as {
    theme?: string;
    fontStyle?: string;
    welcomeMessage?: string;
  } | null;

  if (body?.theme !== undefined && !isTheme(body.theme)) {
    return NextResponse.json({ error: "invalid-theme" }, { status: 400, headers: adminResponseHeaders });
  }
  if (body?.fontStyle !== undefined && !isFontStyle(body.fontStyle)) {
    return NextResponse.json({ error: "invalid-font-style" }, { status: 400, headers: adminResponseHeaders });
  }
  if (
    body?.welcomeMessage !== undefined &&
    (typeof body.welcomeMessage !== "string" || body.welcomeMessage.length > 500)
  ) {
    return NextResponse.json({ error: "invalid-welcome-message" }, { status: 400, headers: adminResponseHeaders });
  }

  const updates: Array<[string, string]> = [];
  if (isTheme(body?.theme)) updates.push(["theme", body.theme]);
  if (isFontStyle(body?.fontStyle)) updates.push(["fontStyle", body.fontStyle]);
  if (typeof body?.welcomeMessage === "string") updates.push(["welcomeMessage", body.welcomeMessage]);
  if (updates.length > 0) {
    await Promise.all(
      updates.map(([key, value]) =>
        db.insert(meta).values({ key, value }).onConflictDoUpdate({ target: meta.key, set: { value } }),
      ),
    );
  }
  return NextResponse.json({ ok: true, themes: THEMES, fontStyles: FONT_STYLES }, { headers: adminResponseHeaders });
}
