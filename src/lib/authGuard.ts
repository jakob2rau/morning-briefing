import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Zusätzliche Absicherung für Server Actions und Route Handler - ergänzt
 * proxy.ts, statt sich allein darauf zu verlassen (Next.js empfiehlt das
 * ausdrücklich: ein künftiger Matcher-Fehler in proxy.ts soll nicht
 * automatisch auch diese Aufrufe ungeschützt lassen, siehe
 * node_modules/next/dist/docs/…/authentication.md, Abschnitt "Server
 * Actions"/"Route Handlers").
 *
 * Prüft nur, ob überhaupt eine Session vorliegt - WER sich anmelden darf,
 * ist bereits beim Login selbst über die E-Mail-Allowlist in auth.ts
 * (callbacks.signIn) entschieden; jede bestehende Session gehört also
 * automatisch zum erlaubten Google-Account.
 */
export async function requireSession(): Promise<Session | null> {
  const session = await auth();
  return session?.user ? session : null;
}
