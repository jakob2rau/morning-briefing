import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/authGuard";
import { removePushSubscription } from "@/lib/push";

// Entfernt eine Push-Subscription wieder (z. B. wenn der Nutzer
// Benachrichtigungen im Browser abbestellt).
export async function POST(request: NextRequest) {
  // Zusätzlich zu proxy.ts (Defense-in-Depth, siehe lib/authGuard.ts).
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint =
    body && typeof body === "object" && "endpoint" in body
      ? (body as { endpoint: unknown }).endpoint
      : undefined;

  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json(
      { error: "Ungültiger Endpoint." },
      { status: 400 },
    );
  }

  await removePushSubscription(endpoint);

  return NextResponse.json({ ok: true });
}
