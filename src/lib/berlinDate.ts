// Kalendertag-Rechnung in der Europe/Berlin-Zeitzone, unabhängig von der
// Server-Zeitzone (Vercel läuft in UTC). Reine Y-M-D-Arithmetik über
// UTC-Epoch-Millisekunden, um DST-Verschiebungen bei lokalen Date-Objekten
// zu vermeiden. Konsistent mit der bestehenden Europe/Berlin-Konvention in
// briefing.ts (formatEventTime) und page.tsx (formatTimestamp).

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function todayBerlinIso(): string {
  // "en-CA" liefert direkt "yyyy-mm-dd".
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(
    new Date(),
  );
}

export function addDaysToIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d) + days * MS_PER_DAY);
  return result.toISOString().slice(0, 10);
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY,
  );
}
