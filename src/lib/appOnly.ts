import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { storageHeaders } from "@/lib/storage";

/**
 * Optional app-only download gate.
 *
 * While APP_ONLY_DOWNLOADS is not "1", every existing client keeps working.
 * Once it is enabled, /api/dl and the /track endpoints require the Android
 * app's headers, and the device id must match the id signed into the session
 * cookie. A copied link opened in a browser is therefore rejected.
 */
export function appOnlyDownloadsEnabled(): boolean {
  return process.env.APP_ONLY_DOWNLOADS === "1";
}

export async function appOnlyGate(request: Request): Promise<NextResponse | null> {
  if (!appOnlyDownloadsEnabled()) return null;

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)dl_session=([^;]+)/);
  const session = verifySession(match?.[1]);
  const deviceId = request.headers.get("x-dordoc-device-id");

  if (
    request.headers.get("x-dordoc-app") !== "1" ||
    !session ||
    !deviceId ||
    deviceId !== session.deviceId
  ) {
    return NextResponse.json(
      {
        error: "app-required",
        message: "التحميل متاح داخل تطبيق أندرويد فقط.",
      },
      { status: 403, headers: storageHeaders },
    );
  }
  return null;
}
