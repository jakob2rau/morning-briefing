import { NextRequest, NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { addPushSubscription } from "@/lib/push";

function isValidSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PushSubscription>;
  return (
    typeof candidate.endpoint === "string" &&
    !!candidate.keys &&
    typeof candidate.keys.p256dh === "string" &&
    typeof candidate.keys.auth === "string"
  );
}

// Speichert eine Browser-Push-Subscription, damit spätere Briefings
// eine Push-Benachrichtigung an dieses Gerät verschicken können.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!isValidSubscription(body)) {
    return NextResponse.json(
      { error: "Ungültige Push-Subscription." },
      { status: 400 },
    );
  }

  await addPushSubscription(body);

  return NextResponse.json({ ok: true });
}
