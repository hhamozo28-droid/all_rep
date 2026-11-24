import { appOnlyGate } from "@/lib/appOnly";
import { deliverGrant } from "@/lib/downloadDelivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const blocked = await appOnlyGate(request);
  if (blocked) return blocked;
  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return new Response(JSON.stringify({ error: "invalid-link" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  }
  return deliverGrant(token);
}
