"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateAndStoreMorningBriefing } from "@/lib/briefing";
import { markDoneToday, resetStreak, type StreakData } from "@/lib/streak";

export type RegenerateResult = { error: string | null };

export async function regenerateBriefing(): Promise<RegenerateResult> {
  const session = await auth();
  const result = await generateAndStoreMorningBriefing(session?.accessToken);

  if (!result.briefing) {
    // Absichtlich die generische Meldung hier - der konkrete Fehlertext
    // (result.error) landet nur im Server-Log bzw. in der CRON_SECRET-
    // geschützten API-Route, nicht direkt in dieser öffentlichen UI.
    return {
      error:
        "Das Briefing konnte nicht neu erstellt werden. Versuch es gleich noch einmal.",
    };
  }

  revalidatePath("/");
  return { error: null };
}

export type MarkDayDoneResult =
  | { streak: StreakData; error: null }
  | { streak: null; error: string };

/**
 * Trägt den heutigen Tag im Streak-Zähler als erledigt ein (siehe
 * src/lib/streak.ts für die "in Folge"-Logik inkl. Schutz vor doppelter
 * Erhöhung bei mehrfachem Klick am selben Tag).
 */
export async function markDayDoneAction(): Promise<MarkDayDoneResult> {
  try {
    const streak = await markDoneToday();
    revalidatePath("/");
    return { streak, error: null };
  } catch (error) {
    console.error("Fehler beim Speichern des Tages-Status", error);
    return {
      streak: null,
      error: "Konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}

/**
 * Nur zu Testzwecken über die Einstellungsseite erreichbar - setzt den
 * Streak-Zähler zurück, damit sich die Erhöhungs-Animation beliebig oft
 * wiederholen lässt.
 */
export async function resetStreakAction(): Promise<void> {
  await resetStreak();
  revalidatePath("/");
}
