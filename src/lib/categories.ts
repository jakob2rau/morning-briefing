// Zentrale Definition der fünf Briefing-Kategorien. Reines Datenmodul (kein
// React-Import), damit es sowohl vom Server (Claude-Prompt in briefing.ts)
// als auch von Client-Komponenten (Karten/Story-Modal) genutzt werden kann,
// ohne dass UI-Belange (Icons, Farben) in die Server-Logik hineinsickern.

export type BriefingCategoryId =
  | "wetter"
  | "tech"
  | "wirtschaft"
  | "politik"
  | "sport";

// Die vier News-basierten Kategorien (alles außer "wetter") - genau die,
// für die sich in den Einstellungen RSS-Feeds konfigurieren lassen.
export type NewsCategoryId = Exclude<BriefingCategoryId, "wetter">;

export type CategoryMeta = {
  id: BriefingCategoryId;
  label: string;
  // Beschreibt Claude, was inhaltlich in diese Kategorie gehört.
  contentHint: string;
  fallbackTeaser: string;
  // Platzhalter-Meldung, falls Claude für diese Kategorie im
  // strukturierten Output keine (validen) Einträge liefert - die Karte
  // im Grid und die Story-Seite sollen nie leer/fehlend sein.
  fallbackItemHeadline: string;
  fallbackItemText: string;
  // Generischer Quellenlink für diese Kategorie - verweist auf die
  // Website, aus der die Rohdaten stammen (src/lib/news.ts bzw.
  // Open-Meteo für "wetter"). Dient als Fallback, wenn Claude für eine
  // einzelne Meldung keinen (validen) Link liefert.
  sourceLabel: string;
  sourceUrl: string;
};

// Feste Reihenfolge für Prompt, Grid und Story-Navigation.
export const CATEGORY_ORDER: readonly BriefingCategoryId[] = [
  "wetter",
  "tech",
  "wirtschaft",
  "politik",
  "sport",
];

// Dieselbe Reihenfolge ohne "wetter" - für die Feed-Einstellungen und den
// Nachrichten-Abschnitt des Claude-Prompts.
export const NEWS_CATEGORY_ORDER: readonly NewsCategoryId[] = CATEGORY_ORDER.filter(
  (id): id is NewsCategoryId => id !== "wetter",
);

export const CATEGORIES: Record<BriefingCategoryId, CategoryMeta> = {
  wetter: {
    id: "wetter",
    label: "Wetter & Termine",
    contentHint:
      "Wetter und die heutigen Termine zusammen - keine Trennung in " +
      "einen Wetter- und einen Termin-Teil. Genau ein Eintrag in " +
      "\"items\".",
    fallbackTeaser: "Keine Wetter- oder Termindaten verfügbar.",
    fallbackItemHeadline: "Keine Daten verfügbar",
    fallbackItemText:
      "Für Wetter und Termine liegen heute leider keine Daten vor.",
    sourceLabel: "Open-Meteo",
    sourceUrl: "https://open-meteo.com",
  },
  tech: {
    id: "tech",
    label: "Tech & KI",
    contentHint:
      "Technik, Startups und KI: 2-3 Einträge in \"items\" für die " +
      "wichtigsten Meldungen.",
    fallbackTeaser: "Heute keine Tech- oder KI-Meldungen.",
    fallbackItemHeadline: "Keine Meldungen",
    fallbackItemText:
      "Zu Technik, Startups und KI gibt es heute keine Meldungen.",
    sourceLabel: "TechCrunch",
    sourceUrl: "https://techcrunch.com",
  },
  wirtschaft: {
    id: "wirtschaft",
    label: "Wirtschaft",
    contentHint:
      "Wirtschaft: genauso wie Tech, 2-3 Einträge in \"items\".",
    fallbackTeaser: "Heute keine Wirtschaftsmeldungen.",
    fallbackItemHeadline: "Keine Meldungen",
    fallbackItemText: "Zur Wirtschaft gibt es heute keine Meldungen.",
    sourceLabel: "tagesschau.de – Wirtschaft",
    sourceUrl: "https://www.tagesschau.de/wirtschaft/konjunktur/",
  },
  politik: {
    id: "politik",
    label: "Politik",
    contentHint:
      "Politik: genauso wie Tech, 2-3 Einträge in \"items\" - gemischt " +
      "aus nationaler und internationaler Politik, je nachdem was an " +
      "dem Tag relevanter ist.",
    fallbackTeaser: "Heute keine Politik-Meldungen.",
    fallbackItemHeadline: "Keine Meldungen",
    fallbackItemText: "Zur Politik gibt es heute keine Meldungen.",
    sourceLabel: "tagesschau.de",
    sourceUrl: "https://www.tagesschau.de",
  },
  sport: {
    id: "sport",
    label: "Sport",
    contentHint:
      "Sport: genauso wie Tech, 2-3 Einträge in \"items\".",
    fallbackTeaser: "Heute keine Sportmeldungen.",
    fallbackItemHeadline: "Keine Meldungen",
    fallbackItemText: "Zum Sport gibt es heute keine Meldungen.",
    sourceLabel: "sportschau.de",
    sourceUrl: "https://www.sportschau.de",
  },
};
