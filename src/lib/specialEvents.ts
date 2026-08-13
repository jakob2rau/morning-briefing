import type { SpecialEvent } from "@/lib/settings";
import { todayBerlinIso, diffDaysIso } from "@/lib/berlinDate";

export type EventCountdown = {
  name: string;
  date: string;
  daysUntil: number;
};

/**
 * Filtert auf Ereignisse innerhalb der nächsten `maxDays` Tage (inkl.
 * heute; `daysUntil >= 0` schließt bereits vergangene Termine aus) und
 * sortiert aufsteigend nach Nähe (bald bevorstehende zuerst). Wird bei
 * jedem Seitenaufruf frisch berechnet - NICHT im einmal täglich
 * generierten Briefing gespeichert, damit der Countdown auch ohne
 * Neu-Erstellung tagesaktuell bleibt.
 */
export function getUpcomingEventCountdowns(
  events: SpecialEvent[],
  maxDays = 60,
): EventCountdown[] {
  const today = todayBerlinIso();
  return events
    .map((event) => ({
      name: event.name,
      date: event.date,
      daysUntil: diffDaysIso(today, event.date),
    }))
    .filter((event) => event.daysUntil >= 0 && event.daysUntil <= maxDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
