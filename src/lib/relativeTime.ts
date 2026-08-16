// Grober, rein clientseitig berechneter relativer Zeitstempel ("vor 2
// Tagen") für Ideen-Einträge - anders als die Kalendertag-Arithmetik in
// berlinDate.ts hier bewusst einfache Wanduhrzeit-Differenz, da es nur um
// eine grobe "vor X"-Anzeige geht, nicht um Kalendertag-Grenzen.

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "gerade eben";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `vor ${diffMin} ${diffMin === 1 ? "Minute" : "Minuten"}`;
  }

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) {
    return `vor ${diffHours} ${diffHours === 1 ? "Stunde" : "Stunden"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `vor ${diffDays} ${diffDays === 1 ? "Tag" : "Tagen"}`;
  }

  if (diffDays < 30) {
    const diffWeeks = Math.round(diffDays / 7);
    return `vor ${diffWeeks} ${diffWeeks === 1 ? "Woche" : "Wochen"}`;
  }

  if (diffDays < 365) {
    const diffMonths = Math.round(diffDays / 30);
    return `vor ${diffMonths} ${diffMonths === 1 ? "Monat" : "Monaten"}`;
  }

  const diffYears = Math.round(diffDays / 365);
  return `vor ${diffYears} ${diffYears === 1 ? "Jahr" : "Jahren"}`;
}
