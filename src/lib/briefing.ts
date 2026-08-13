import Anthropic from "@anthropic-ai/sdk";
import { getMainzWeather, type WeatherSummary } from "@/lib/weather";
import { getAllNews } from "@/lib/news";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/calendar";
import { sendBriefingPushNotification } from "@/lib/push";
import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  type BriefingCategoryId,
} from "@/lib/categories";

export type BriefingCategory = {
  id: BriefingCategoryId;
  teaser: string;
  fullText: string;
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

function buildDataSummary(
  weather: WeatherSummary | null,
  news: NewsSummary,
  events: CalendarEvent[],
) {
  const weatherLine = weather
    ? `${Math.round(weather.temperature)}°C, ${weather.description}`
    : "keine Wetterdaten verfügbar";

  const eventsBlock = events.length
    ? events.map((event) => `- ${formatEventTime(event)}: ${event.title}`).join("\n")
    : "- keine Termine";

  const newsBlock = news
    .map((source) => {
      const headlines = source.headlines.length
        ? source.headlines.map((headline) => `  - ${headline.title}`).join("\n")
        : "  - keine Schlagzeilen verfügbar";
      return `${source.label}:\n${headlines}`;
    })
    .join("\n");

  return [
    `Wetter in Mainz: ${weatherLine}`,
    `Termine heute:\n${eventsBlock}`,
    `Nachrichten:\n${newsBlock}`,
  ].join("\n\n");
}

function buildSystemPrompt(): string {
  const categoryInstructions = CATEGORY_ORDER.map((id, index) => {
    const category = CATEGORIES[id];
    return `${index + 1}. ${category.label} (id: "${category.id}"): ${category.contentHint}`;
  }).join("\n");

  return (
    "Du erstellst ein sehr ausführliches, persönliches Morgenbriefing " +
    "auf Deutsch, aufgeteilt in genau fünf Kategorien. Rufe dafür das " +
    `Tool "${SUBMIT_BRIEFING_TOOL_NAME}" auf und liefere für jede der ` +
    "folgenden fünf Kategorien einen Eintrag - in dieser Reihenfolge:\n" +
    categoryInstructions +
    "\n\nJeder Eintrag besteht aus:\n" +
    "- \"teaser\": 1-2 kurze, eigenständige Sätze für eine Vorschau-Karte. " +
    "Keine Kopie des ersten Satzes von \"fullText\", sondern eine " +
    "unabhängige Kurzfassung.\n" +
    "- \"fullText\": der ausführliche Text zur Kategorie als Fließtext, " +
    "ohne Überschriften und ohne Aufzählungszeichen. Nutze die " +
    "bereitgestellten Schlagzeilen der jeweiligen Kategorie und " +
    "verarbeite mehrere davon, nicht nur die erste.\n\n" +
    "Liefere IMMER alle fünf Kategorien. Wenn zu einer Kategorie an " +
    "diesem Tag wirklich keine Daten vorliegen, schreibe knapp, dass es " +
    "dazu heute keine Meldungen gibt - lass die Kategorie aber niemals " +
    "weg. Schreibe warm und direkt."
  );
}

function buildBriefingTool(): Anthropic.Tool {
  return {
    name: SUBMIT_BRIEFING_TOOL_NAME,
    description: "Liefert das strukturierte Morgenbriefing als fünf Kategorien.",
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
              fullText: { type: "string" },
            },
            required: ["id", "teaser", "fullText"],
          },
        },
      },
      required: ["categories"],
    },
  };
}

/**
 * Validiert und normalisiert den (untypisierten) Tool-Input von Claude:
 * unbekannte/ungültige Einträge werden verworfen, Duplikate nach `id`
 * entfernt, und das Ergebnis wird in fester `CATEGORY_ORDER`-Reihenfolge
 * mit exakt fünf Einträgen zurückgegeben - fehlende Kategorien werden mit
 * einem Platzhaltertext aufgefüllt, damit im Grid nie eine Karte fehlt.
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
    const { id, teaser, fullText } = entry as Record<string, unknown>;

    if (typeof id !== "string" || !CATEGORY_ORDER.includes(id as BriefingCategoryId)) {
      continue;
    }
    if (byId.has(id as BriefingCategoryId)) continue;

    const trimmedTeaser = typeof teaser === "string" ? teaser.trim() : "";
    const trimmedFullText = typeof fullText === "string" ? fullText.trim() : "";
    if (!trimmedTeaser && !trimmedFullText) continue;

    byId.set(id as BriefingCategoryId, {
      id: id as BriefingCategoryId,
      teaser: trimmedTeaser || CATEGORIES[id as BriefingCategoryId].fallbackTeaser,
      fullText:
        trimmedFullText || CATEGORIES[id as BriefingCategoryId].fallbackFullText,
    });
  }

  return CATEGORY_ORDER.map(
    (id) =>
      byId.get(id) ?? {
        id,
        teaser: CATEGORIES[id].fallbackTeaser,
        fullText: CATEGORIES[id].fallbackFullText,
      },
  );
}

async function callClaude(dataSummary: string): Promise<BriefingCategory[] | null> {
  const tool = buildBriefingTool();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3200,
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

  if (!toolUse) return null;

  return normalizeCategories(toolUse.input);
}

async function saveBriefing(briefing: MorningBriefing) {
  await writeJsonBlob(BRIEFING_BLOB_PATH, briefing);
}

function isValidBriefing(value: unknown): value is MorningBriefing {
  if (!value || typeof value !== "object") return false;
  const categories = (value as { categories?: unknown }).categories;
  return Array.isArray(categories) && categories.length === CATEGORY_ORDER.length;
}

export type GenerateBriefingResult =
  | { briefing: MorningBriefing; error: null }
  | { briefing: null; error: string };

/**
 * Sammelt Wetter-, News- und Kalenderdaten, lässt Claude daraus ein
 * strukturiertes Morgenbriefing (Teaser + Volltext pro Kategorie)
 * formulieren und speichert das Ergebnis für die spätere Anzeige. Mit
 * `notify: true` (z. B. im Cron-Job) wird zusätzlich eine Push-
 * Benachrichtigung mit dem Wetter-Teaser an alle angemeldeten Geräte
 * verschickt.
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
  const [weather, news, events] = await Promise.all([
    getMainzWeather(),
    getAllNews(5),
    accessToken ? getUpcomingEvents(accessToken) : Promise.resolve([]),
  ]);

  const dataSummary = buildDataSummary(weather, news, events);

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
  // Ein älterer Blob im alten Freitext-Format ({text, generatedAt}) wird
  // hier bewusst wie "noch kein Briefing vorhanden" behandelt, statt zu
  // crashen - der Aufrufer generiert dann einfach ein frisches Briefing
  // im neuen Format.
  return isValidBriefing(raw) ? raw : null;
}
