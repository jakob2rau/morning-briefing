import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/push";

// Entfernt eine Push-Subscription wieder (z. B. wenn der Nutzer
// Benachrichtigungen im Browser abbestellt).
export async function POST(request: NextRequest) {
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
