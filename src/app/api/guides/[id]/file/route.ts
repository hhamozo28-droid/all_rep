import { NextResponse } from "next/server";
import { deliverGrant } from "@/lib/downloadDelivery";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Legacy compatibility endpoint. It no longer serves a reusable PDF URL;
 * callers must use the one-attempt token returned by /track.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "update-required" },
      { status: 410, headers: storageHeaders },
    );
  }
  return deliverGrant(token, { itemId: id });
}
