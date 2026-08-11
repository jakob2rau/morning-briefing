import fs from "node:fs/promises";
import path from "node:path";
import webpush, { type PushSubscription } from "web-push";

const STORAGE_DIR = path.join(process.cwd(), "data");
const STORAGE_PATH = path.join(STORAGE_DIR, "push-subscriptions.json");

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID-Konfiguration fehlt (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

async function readSubscriptions(): Promise<PushSubscription[]> {
  try {
    const raw = await fs.readFile(STORAGE_PATH, "utf-8");
    return JSON.parse(raw) as PushSubscription[];
  } catch {
    return [];
  }
}

async function writeSubscriptions(subscriptions: PushSubscription[]) {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(
    STORAGE_PATH,
    JSON.stringify(subscriptions, null, 2),
    "utf-8",
  );
}

export async function addPushSubscription(subscription: PushSubscription) {
  const subscriptions = await readSubscriptions();
  const withoutExisting = subscriptions.filter(
    (existing) => existing.endpoint !== subscription.endpoint,
  );
  withoutExisting.push(subscription);
  await writeSubscriptions(withoutExisting);
}

export async function removePushSubscription(endpoint: string) {
  const subscriptions = await readSubscriptions();
  const remaining = subscriptions.filter(
    (existing) => existing.endpoint !== endpoint,
  );
  if (remaining.length !== subscriptions.length) {
    await writeSubscriptions(remaining);
  }
}

/**
 * Baut aus dem Briefing-Text einen kurzen Teaser-Satz für die
 * Push-Benachrichtigung (überspringt eine reine Begrüßung wie
 * "Guten Morgen!" und kürzt bei Bedarf).
 */
export function buildBriefingTeaser(text: string): string {
  const firstParagraph = text.split(/\n\s*\n/)[0]?.trim() ?? text.trim();
  const sentences = firstParagraph.match(/[^.!?]+[.!?]+/g) ?? [firstParagraph];
  const meaningful = sentences.find((sentence) => sentence.trim().length > 12);
  const teaser = (meaningful ?? sentences[0] ?? firstParagraph).trim();

  return teaser.length > 140 ? `${teaser.slice(0, 137).trimEnd()}…` : teaser;
}

/**
 * Verschickt eine Push-Benachrichtigung mit Teaser-Text an alle
 * gespeicherten Subscriptions. Nicht mehr gültige Subscriptions (z. B.
 * abgemeldete Geräte) werden dabei automatisch entfernt.
 */
export async function sendBriefingPushNotification(
  briefingText: string,
): Promise<void> {
  const subscriptions = await readSubscriptions();
  if (subscriptions.length === 0) return;

  configureVapid();

  const payload = JSON.stringify({
    title: "Dein Morgenbriefing ist da ☀️",
    body: buildBriefingTeaser(briefingText),
    url: "/",
  });

  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(subscription.endpoint);
        } else {
          console.error("Fehler beim Versenden einer Push-Benachrichtigung", error);
        }
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    const remaining = subscriptions.filter(
      (subscription) => !staleEndpoints.includes(subscription.endpoint),
    );
    await writeSubscriptions(remaining);
  }
}
