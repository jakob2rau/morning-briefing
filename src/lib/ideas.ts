// Reines, client-sicheres Datenmodul: nur Typen + Konstanten, KEINE
// serverseitigen Imports (kein @vercel/blob, kein @anthropic-ai/sdk).
//
// Wichtig: Client Components wie IdeasBoard.tsx importieren IDEA_CATEGORIES
// als echten Wert (nicht nur den Typ) - jeder Import eines echten Werts
// bündelt die GESAMTE Datei in den Browser-Bundle, inklusive aller
// Top-Level-Seiteneffekte. Vorher lag hier auch `new Anthropic()` auf
// Modulebene (siehe lib/ideaStore.ts) - das landete dadurch im
// Client-Bundle und crashte dort beim Laden mit "It looks like you're
// running in a browser-like environment" (Anthropics eingebauter Schutz
// gegen versehentlich im Browser laufende API-Clients). Das brach die
// komplette Seite nach dem Login (sobald die echten, mit dieser Datei
// gebauten Chunks geladen wurden) - deshalb server-only Code strikt in
// lib/ideaStore.ts halten, hier nur Dinge, die zu 100% client-sicher sind.

export type IdeaCategory = "app-idee" | "geschenk" | "sonstiges";

export const IDEA_CATEGORIES: readonly IdeaCategory[] = [
  "app-idee",
  "geschenk",
  "sonstiges",
];

export type Idea = {
  id: string;
  text: string;
  category: IdeaCategory;
  createdAt: string; // ISO
};

export function isValidIdeaCategory(value: unknown): value is IdeaCategory {
  return (
    typeof value === "string" &&
    (IDEA_CATEGORIES as readonly string[]).includes(value)
  );
}
