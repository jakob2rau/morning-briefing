import Anthropic from "@anthropic-ai/sdk";
import { getWeather, type WeatherSummary } from "@/lib/weather";
import { getAllNews } from "@/lib/news";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/calendar";
import { sendBriefingPushNotification } from "@/lib/push";
import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";
import { getStoredSettings } from "@/lib/settings";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  NEWS_CATEGORY_ORDER,
  type BriefingCategoryId,
} from "@/lib/categories";

export type BriefingItem = {
  headline: string;
  text: string;
  // Ausführlichere Version von "text" (ca. 8-9 Sätze, mehr Details/
  // Hintergrund) - wird erst angezeigt, wenn der Nutzer den Meldungs-
  // Block per Tap aufklappt.
  expandedText: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type BriefingCategory = {
  id: BriefingCategoryId;
  teaser: string;
  items: BriefingItem[];
};

export type MorningBriefing = {
  categories: BriefingCategory[];
  generatedAt: string; // ISO-Zeitstempel
};

type NewsSummary = Awaited<ReturnType<typeof getAllNews>>;

const BRIEFING_BLOB_PATH = "morning-briefing.json";
const SUBMIT_BRIEFING_TOOL_NAME = "submit_briefing";

const MODEL = "claude-haiku-4-5-20251001";

const client = new Anthropic();

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return "ganztägig";
  return new Date(event.start).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function formatTodayForPrompt(): string {
  return new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function buildDataSummary(
  weather: WeatherSummary | null,
  news: NewsSummary,
  events: CalendarEvent[],
  cityName: string,
) {
  const weatherLine = weather
    ? `${Math.round(weather.temperature)}°C, ${weather.description}`
    : "keine Wetterdaten verfügbar";

  const eventsBlock = events.length
    ? events.map((event) => `- ${formatEventTime(event)}: ${event.title}`).join("\n")
    : "- keine Termine";

  const newsBlock = NEWS_CATEGORY_ORDER.map((id) => {
    const entry = news.find((source) => source.id === id);
    const headlines = entry?.headlines.length
      ? entry.headlines
          .map((headline) => `  - ${headline.title} (${headline.link})`)
          .join("\n")
      : "  - keine Schlagzeilen verfügbar";
    return `${CATEGORIES[id].label}:\n${headlines}`;
  }).join("\n");

  return [
    `Heutiges Datum: ${formatTodayForPrompt()}`,
    `Wetter in ${cityName}: ${weatherLine}`,
    `Termine heute:\n${eventsBlock}`,
    `Nachrichten (Titel und Link):\n${newsBlock}`,
  ].join("\n\n");
}

const CATEGORY_COUNT_WORDS_DE: Record<number, string> = {
  4: "vier",
  5: "fünf",
  6: "sechs",
  7: "sieben",
};

function categoryCountWord(): string {
  return CATEGORY_COUNT_WORDS_DE[CATEGORY_ORDER.length] ?? String(CATEGORY_ORDER.length);
}

function buildSystemPrompt(): string {
  const categoryInstructions = CATEGORY_ORDER.map((id, index) => {
    const category = CATEGORIES[id];
    return `${index + 1}. ${category.label} (id: "${category.id}"): ${category.contentHint}`;
  }).join("\n");
  const countWord = categoryCountWord();

  return (
    "Du erstellst ein sehr ausführliches, persönliches Morgenbriefing " +
    `auf Deutsch, aufgeteilt in genau ${countWord} Kategorien. Rufe ` +
    `dafür das Tool "${SUBMIT_BRIEFING_TOOL_NAME}" auf und liefere für ` +
    `jede der folgenden ${countWord} Kategorien einen Eintrag - in ` +
    "dieser Reihenfolge:\n" +
    categoryInstructions +
    "\n\nJeder Kategorie-Eintrag besteht aus:\n" +
    "- \"teaser\": 1-2 kurze, eigenständige Sätze für eine Vorschau-Karte, " +
    "als Zusammenfassung der ganzen Kategorie.\n" +
    "- \"items\": eine Liste einzelner Meldungen (bei \"wetter\" und " +
    "\"tag\" genau eine, sonst 2-3). Jede Meldung besteht aus:\n" +
    "  - \"headline\": eine kurze, eigenständig formulierte Überschrift " +
    "(nicht einfach die Original-Schlagzeile kopieren).\n" +
    "  - \"text\": 2-3 Sätze Einordnung - was ist passiert, und warum " +
    "ist es relevant. Fließtext ohne Aufzählungszeichen.\n" +
    "  - \"expandedText\": eine ausführlichere Version derselben Meldung " +
    "mit ca. 8-9 Sätzen - mehr Hintergrund, Kontext, Zahlen/Fakten " +
    "soweit vorhanden. Keine reine Wiederholung von \"text\", sondern " +
    "eine echte Erweiterung um zusätzliche Details. Ebenfalls Fließtext " +
    "ohne Aufzählungszeichen.\n" +
    "  - \"sourceLabel\": Name der Quelle (z. B. \"tagesschau.de\", " +
    "\"TechCrunch\").\n" +
    "  - \"sourceUrl\": bei Nachrichten-Kategorien EXAKT einer der oben " +
    "bereitgestellten Links zu dieser Meldung - nicht selbst erfinden " +
    "oder verändern. Bei \"wetter\" und \"tag\" kannst du \"sourceLabel\" " +
    "und \"sourceUrl\" leer lassen.\n\n" +
    `Liefere IMMER alle ${countWord} Kategorien mit mindestens einem ` +
    "Eintrag in \"items\". Wenn zu einer Kategorie an diesem Tag " +
    "wirklich keine Daten vorliegen, liefere einen einzelnen Eintrag, " +
    "der das knapp erklärt - lass die Kategorie aber niemals ganz weg. " +
    "Schreibe warm und direkt."
  );
}

function buildBriefingTool(): Anthropic.Tool {
  return {
    name: SUBMIT_BRIEFING_TOOL_NAME,
    description: `Liefert das strukturierte Morgenbriefing als ${categoryCountWord()} Kategorien.`,
    input_schema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: [...CATEGORY_ORDER] },
              teaser: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    text: { type: "string" },
                    expandedText: { type: "string" },
                    sourceLabel: { type: "string" },
                    sourceUrl: { type: "string" },
                  },
                  required: ["headline", "text", "expandedText"],
                },
              },
            },
            required: ["id", "teaser", "items"],
          },
        },
      },
      required: ["categories"],
    },
  };
}

function isValidSourceUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/**
 * Validiert und normalisiert eine einzelne Meldung. Fehlt ein gültiger
 * Quellenlink (leer, fehlt oder von Claude erfunden statt aus den
 * Rohdaten kopiert), wird auf den generischen Kategorie-Link
 * zurückgefallen statt einen potenziell kaputten/falschen Link
 * anzuzeigen.
 */
function normalizeItem(
  entry: unknown,
  category: BriefingCategoryId,
): BriefingItem | null {
  if (!entry || typeof entry !== "object") return null;
  const { headline, text, expandedText, sourceLabel, sourceUrl } =
    entry as Record<string, unknown>;

  const trimmedHeadline = typeof headline === "string" ? headline.trim() : "";
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedHeadline && !trimmedText) return null;

  const fallback = CATEGORIES[category];
  const trimmedSourceLabel =
    typeof sourceLabel === "string" ? sourceLabel.trim() : "";
  const trimmedExpandedText =
    typeof expandedText === "string" ? expandedText.trim() : "";
  const resolvedText = trimmedText || fallback.fallbackItemText;

  return {
    headline: trimmedHeadline || fallback.fallbackItemHeadline,
    text: resolvedText,
    // Fällt zurück auf den kurzen Text, falls Claude keinen (validen)
    // Langtext liefert - immer noch besser, als eine leere Ansicht beim
    // Aufklappen zu zeigen.
    expandedText: trimmedExpandedText || resolvedText,
    sourceLabel: trimmedSourceLabel || fallback.sourceLabel,
    sourceUrl: isValidSourceUrl(sourceUrl) ? sourceUrl.trim() : fallback.sourceUrl,
  };
}

/**
 * Validiert und normalisiert den (untypisierten) Tool-Input von Claude:
 * unbekannte/ungültige Einträge werden verworfen, Duplikate nach `id`
 * entfernt, und das Ergebnis wird in fester `CATEGORY_ORDER`-Reihenfolge
 * mit exakt fünf Einträgen zurückgegeben - fehlende Kategorien bzw.
 * Kategorien ohne verwertbare Meldungen werden mit einem
 * Platzhalter-Eintrag aufgefüllt, damit im Grid nie eine Karte fehlt.
 */
function normalizeCategories(input: unknown): BriefingCategory[] {
  const rawCategories =
    input &&
    typeof input === "object" &&
    Array.isArray((input as { categories?: unknown }).categories)
      ? (input as { categories: unknown[] }).categories
      : [];

  const byId = new Map<BriefingCategoryId, BriefingCategory>();

  for (const entry of rawCategories) {
    if (!entry || typeof entry !== "object") continue;
    const { id, teaser, items } = entry as Record<string, unknown>;

    if (typeof id !== "string" || !CATEGORY_ORDER.includes(id as BriefingCategoryId)) {
      continue;
    }
    const categoryId = id as BriefingCategoryId;
    if (byId.has(categoryId)) continue;

    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((item) => normalizeItem(item, categoryId))
      .filter((item): item is BriefingItem => item !== null);

    const trimmedTeaser = typeof teaser === "string" ? teaser.trim() : "";
    if (!trimmedTeaser && normalizedItems.length === 0) continue;

    byId.set(categoryId, {
      id: categoryId,
      teaser: trimmedTeaser || CATEGORIES[categoryId].fallbackTeaser,
      items:
        normalizedItems.length > 0
          ? normalizedItems
          : [
              {
                headline: CATEGORIES[categoryId].fallbackItemHeadline,
                text: CATEGORIES[categoryId].fallbackItemText,
                expandedText: CATEGORIES[categoryId].fallbackItemText,
                sourceLabel: CATEGORIES[categoryId].sourceLabel,
                sourceUrl: CATEGORIES[categoryId].sourceUrl,
              },
            ],
    });
  }

  return CATEGORY_ORDER.map((id) => {
    const category = CATEGORIES[id];
    return (
      byId.get(id) ?? {
        id,
        teaser: category.fallbackTeaser,
        items: [
          {
            headline: category.fallbackItemHeadline,
            text: category.fallbackItemText,
            expandedText: category.fallbackItemText,
            sourceLabel: category.sourceLabel,
            sourceUrl: category.sourceUrl,
          },
        ],
      }
    );
  });
}

async function callClaude(dataSummary: string): Promise<BriefingCategory[] | null> {
  const tool = buildBriefingTool();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 6500,
    system: buildSystemPrompt(),
    tools: [tool],
    tool_choice: { type: "tool", name: SUBMIT_BRIEFING_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Hier sind die heutigen Daten:\n\n${dataSummary}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === SUBMIT_BRIEFING_TOOL_NAME,
  );

  // Nur bei einem auffälligen Abschluss loggen (z. B. durch "max_tokens"
  // abgeschnitten) - hilft, einen künftigen Fehlschlag einzuordnen, ohne
  // bei jedem normalen Lauf Error-Logs zu erzeugen.
  if (response.stop_reason !== "tool_use" || !toolUse) {
    console.error(
      "callClaude: unerwarteter Antwortabschluss",
      JSON.stringify({
        stopReason: response.stop_reason,
        hasToolUse: Boolean(toolUse),
      }),
    );
  }

  if (!toolUse) return null;

  const rawCategoriesLength = Array.isArray(
    (toolUse.input as { categories?: unknown })?.categories,
  )
    ? ((toolUse.input as { categories: unknown[] }).categories.length)
    : 0;

  if (rawCategoriesLength === 0) {
    // Tool wurde aufgerufen, aber ohne verwertbare "categories" - z. B.
    // wenn Claude aus irgendeinem Grund ein leeres Array liefert. Landet
    // sonst unsichtbar als lauter Platzhalter-Kategorien im Ergebnis.
    console.error(
      "callClaude: Tool-Input enthält keine categories",
      JSON.stringify(toolUse.input).slice(0, 500),
    );
  }

  return normalizeCategories(toolUse.input);
}

async function saveBriefing(briefing: MorningBriefing) {
  await writeJsonBlob(BRIEFING_BLOB_PATH, briefing);
}

function isValidBriefing(value: unknown): value is MorningBriefing {
  if (!value || typeof value !== "object") return false;
  const categories = (value as { categories?: unknown }).categories;
  if (!Array.isArray(categories) || categories.length !== CATEGORY_ORDER.length) {
    return false;
  }
  // Ältere Formate (Freitext-"fullText" statt "items", oder "items" ohne
  // "expandedText" für die Tap-to-expand-Ansicht) sollen ebenfalls als
  // ungültig gelten, damit sie durch ein frisches Briefing im aktuellen
  // Format ersetzt werden statt die Story-Ansicht crashen zu lassen.
  return categories.every((category) => {
    const items = (category as { items?: unknown })?.items;
    return (
      category &&
      typeof category === "object" &&
      Array.isArray(items) &&
      items.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { expandedText?: unknown }).expandedText === "string",
      )
    );
  });
}

export type GenerateBriefingResult =
  | { briefing: MorningBriefing; error: null }
  | { briefing: null; error: string };

/**
 * Sammelt Wetter-, News- und Kalenderdaten, lässt Claude daraus ein
 * strukturiertes Morgenbriefing (Teaser + einzelne Meldungen pro
 * Kategorie) formulieren und speichert das Ergebnis für die spätere
 * Anzeige. Mit `notify: true` (z. B. im Cron-Job) wird zusätzlich eine
 * Push-Benachrichtigung mit dem Wetter-Teaser an alle angemeldeten
 * Geräte verschickt.
 *
 * Gibt bei einem Fehlschlag die tatsächliche Fehlermeldung mit zurück
 * (nicht nur `null`), damit Aufrufer sie kontrolliert - z. B. nur nach
 * Prüfung eines Secrets - an einen Nutzer weitergeben können, statt sie
 * nur im Server-Log zu haben.
 */
export async function generateAndStoreMorningBriefing(
  accessToken?: string,
  options?: { notify?: boolean },
): Promise<GenerateBriefingResult> {
  const settings = await getStoredSettings();

  const [weather, news, events] = await Promise.all([
    getWeather(settings.weather),
    getAllNews(settings.feeds, 5),
    accessToken ? getUpcomingEvents(accessToken) : Promise.resolve([]),
  ]);

  const dataSummary = buildDataSummary(
    weather,
    news,
    events,
    settings.weather.cityName,
  );

  try {
    const categories = await callClaude(dataSummary);
    if (!categories) {
      return { briefing: null, error: "Claude hat keinen Text geliefert." };
    }

    const briefing: MorningBriefing = {
      categories,
      generatedAt: new Date().toISOString(),
    };

    await saveBriefing(briefing);

    if (options?.notify) {
      try {
        const teaser =
          categories.find((category) => category.id === "wetter")?.teaser ??
          "Dein neues Morgenbriefing ist da.";
        await sendBriefingPushNotification(teaser);
      } catch (error) {
        // Push-Fehler sollen das frisch erstellte Briefing nicht ungültig machen.
        console.error("Fehler beim Versenden der Push-Benachrichtigung", error);
      }
    }

    return { briefing, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Fehler beim Erstellen des Morgenbriefings", error);
    return { briefing: null, error: message };
  }
}

export async function getStoredMorningBriefing(): Promise<MorningBriefing | null> {
  const raw = await readJsonBlob<unknown>(BRIEFING_BLOB_PATH);
  // Ein älterer Blob in einem älteren Format wird hier bewusst wie "noch
  // kein Briefing vorhanden" behandelt, statt zu crashen - der Aufrufer
  // generiert dann einfach ein frisches Briefing im aktuellen Format.
  return isValidBriefing(raw) ? raw : null;
}
