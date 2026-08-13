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

export type CategoryMeta = {
  id: BriefingCategoryId;
  label: string;
  // Beschreibt Claude, was inhaltlich in diese Kategorie gehört.
  contentHint: string;
  // Platzhalter, falls Claude die Kategorie im strukturierten Output
  // ausnahmsweise doch ausn­lässt - die Karte im Grid soll nie fehlen.
  fallbackTeaser: string;
  fallbackFullText: string;
  // Anzeige eines Quellenlinks in der Story-Ansicht - verweist auf die
  // Website(s), aus denen die Rohdaten für diese Kategorie stammen
  // (src/lib/news.ts bzw. Open-Meteo für "wetter"), nicht auf einen
  // einzelnen von Claude verarbeiteten Artikel.
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

export const CATEGORIES: Record<BriefingCategoryId, CategoryMeta> = {
  wetter: {
    id: "wetter",
    label: "Wetter & Termine",
    contentHint:
      "Wetter und die heutigen Termine zusammen - keine Trennung in " +
      "einen Wetter- und einen Termin-Teil.",
    fallbackTeaser: "Keine Wetter- oder Termindaten verfügbar.",
    fallbackFullText:
      "Für Wetter und Termine liegen heute leider keine Daten vor.",
    sourceLabel: "Wetterdaten von Open-Meteo",
    sourceUrl: "https://open-meteo.com",
  },
  tech: {
    id: "tech",
    label: "Tech & KI",
    contentHint:
      "Technik, Startups und KI: die 2-3 wichtigsten Meldungen, jede " +
      "mit 2-3 Sätzen Einordnung - was ist passiert, und warum ist es " +
      "relevant.",
    fallbackTeaser: "Heute keine Tech- oder KI-Meldungen.",
    fallbackFullText:
      "Zu Technik, Startups und KI gibt es heute keine Meldungen.",
    sourceLabel: "TechCrunch",
    sourceUrl: "https://techcrunch.com",
  },
  wirtschaft: {
    id: "wirtschaft",
    label: "Wirtschaft",
    contentHint:
      "Wirtschaft: genauso ausführlich wie Tech, ebenfalls 2-3 " +
      "Meldungen mit je 2-3 Sätzen Einordnung.",
    fallbackTeaser: "Heute keine Wirtschaftsmeldungen.",
    fallbackFullText: "Zur Wirtschaft gibt es heute keine Meldungen.",
    sourceLabel: "tagesschau.de – Wirtschaft",
    sourceUrl: "https://www.tagesschau.de/wirtschaft/konjunktur/",
  },
  politik: {
    id: "politik",
    label: "Politik",
    contentHint:
      "Politik: genauso ausführlich wie Tech, ebenfalls 2-3 Meldungen " +
      "mit je 2-3 Sätzen Einordnung - gemischt aus deutscher und " +
      "internationaler Politik (Quellen \"Politik (Deutschland)\" und " +
      "\"Politik (International)\"), je nachdem was an dem Tag " +
      "relevanter ist.",
    fallbackTeaser: "Heute keine Politik-Meldungen.",
    fallbackFullText: "Zur Politik gibt es heute keine Meldungen.",
    sourceLabel: "tagesschau.de",
    sourceUrl: "https://www.tagesschau.de",
  },
  sport: {
    id: "sport",
    label: "Sport",
    contentHint:
      "Sport: genauso ausführlich wie Tech, ebenfalls 2-3 Meldungen " +
      "mit je 2-3 Sätzen Einordnung.",
    fallbackTeaser: "Heute keine Sportmeldungen.",
    fallbackFullText: "Zum Sport gibt es heute keine Meldungen.",
    sourceLabel: "sportschau.de",
    sourceUrl: "https://www.sportschau.de",
  },
};
