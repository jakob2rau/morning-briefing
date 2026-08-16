import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireSession } from "@/lib/authGuard";
import {
  generateAndStoreMorningBriefing,
  getStoredMorningBriefing,
} from "@/lib/briefing";

// Prüft, ob die Anfrage das gültige CRON_SECRET mitbringt (Vercel hängt
// dieses bei konfigurierten Cron-Jobs automatisch als
// "Authorization: Bearer <CRON_SECRET>"-Header an).
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// GET: liefert normalerweise nur das zuletzt gespeicherte Morgenbriefing
// (kostenlos, kein Claude-Aufruf). Trägt die Anfrage ein gültiges
// CRON_SECRET (z. B. der tägliche Vercel-Cron-Job), wird stattdessen ein
// neues Briefing erstellt und gespeichert - Vercel Cron Jobs rufen ihre
// Route immer per GET auf, daher übernimmt GET hier zusätzlich die Rolle
// des geplanten Trigger.
//
// Diese Route ist bewusst von proxy.ts ausgenommen (der Cron-Job hat
// keine Browser-Session), schützt sich also selbst: der Cron-Pfad über
// CRON_SECRET oben, der "normale" Lesepfad hier unten über eine eigene
// Session-Prüfung - ohne die wäre das gespeicherte Briefing sonst
// öffentlich abrufbar gewesen.
export async function GET(request: NextRequest) {
  if (isAuthorized(request)) {
    return regenerate();
  }

  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const briefing = await getStoredMorningBriefing();

  if (!briefing) {
    return NextResponse.json(
      { error: "Noch kein Morgenbriefing vorhanden." },
      { status: 404 },
    );
  }

  return NextResponse.json(briefing);
}

// POST: manuelles Neu-Erstellen. Erfordert ebenfalls das CRON_SECRET,
// damit nicht irgendwer von außen die teure Claude-API-Anfrage auslösen
// kann.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return regenerate();
}

async function regenerate() {
  // Ein Cron-Aufruf hat keine Browser-Session; Kalendertermine fließen
  // dann nur ein, wenn zufällig eine gültige Session vorliegt. Diese
  // Route ist ausschließlich über das CRON_SECRET erreichbar (Cron-Job
  // oder manueller Trigger), daher wird hier immer eine
  // Push-Benachrichtigung verschickt.
  const session = await auth();
  const result = await generateAndStoreMorningBriefing(session?.accessToken, {
    notify: true,
  });

  if (!result.briefing) {
    // Diese Route ist bereits per CRON_SECRET geschützt (siehe
    // isAuthorized oben) - deshalb ist es hier sicher, den echten
    // Fehlertext mit auszugeben, statt nur die generische Meldung.
    return NextResponse.json(
      {
        error: "Morgenbriefing konnte nicht erstellt werden.",
        details: result.error,
      },
      { status: 502 },
    );
  }

  // Wie beim manuellen "Neu erstellen" (siehe actions.ts) - stellt sicher,
  // dass ein Seitenaufruf direkt nach dem Cron-Lauf nicht noch eine
  // gecachte Version von "/" bekommt.
  revalidatePath("/");

  return NextResponse.json(result.briefing);
}
