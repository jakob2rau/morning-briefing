import Anthropic from "@anthropic-ai/sdk";
import { getMainzWeather, type WeatherSummary } from "@/lib/weather";
import { getAllNews } from "@/lib/news";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/calendar";
import { sendBriefingPushNotification } from "@/lib/push";
import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";

export type MorningBriefing = {
  text: string;
  generatedAt: string; // ISO-Zeitstempel
};

type NewsSummary = Awaited<ReturnType<typeof getAllNews>>;

const BRIEFING_BLOB_PATH = "morning-briefing.json";

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

async function callClaude(dataSummary: string): Promise<string | null> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2200,
    system:
      "Du schreibst ein sehr ausführliches, persönliches Morgenbriefing " +
      "auf Deutsch. Es besteht aus genau fünf Absätzen, jeweils getrennt " +
      "durch eine Leerzeile, ohne Überschriften und ohne " +
      "Aufzählungszeichen:\n" +
      "1. Wetter und die heutigen Termine zusammen in einem Absatz.\n" +
      "2. Technik, Startups und KI: die 2-3 wichtigsten Meldungen, jede " +
      "in 2-3 Sätzen erklärt - was ist passiert, und warum ist es " +
      "relevant.\n" +
      "3. Wirtschaft: genauso ausführlich wie Absatz 2, ebenfalls " +
      "2-3 Meldungen mit je 2-3 Sätzen Einordnung.\n" +
      "4. Politik: genauso ausführlich wie Absatz 2, ebenfalls " +
      "2-3 Meldungen mit je 2-3 Sätzen Einordnung.\n" +
      "5. Sport: genauso ausführlich wie Absatz 2, ebenfalls " +
      "2-3 Meldungen mit je 2-3 Sätzen Einordnung.\n" +
      "Nutze für die vier Nachrichten-Absätze die bereitgestellten " +
      "Schlagzeilen der jeweiligen Kategorie und verarbeite mehrere davon, " +
      "nicht nur die erste. Schreibe warm und direkt. Lass einen Absatz " +
      "nur weg, wenn für diese Kategorie wirklich keine Daten vorhanden " +
      "sind.",
    messages: [
      {
        role: "user",
        content: `Hier sind die heutigen Daten:\n\n${dataSummary}`,
      },
    ],
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  return text || null;
}

async function saveBriefing(briefing: MorningBriefing) {
  await writeJsonBlob(BRIEFING_BLOB_PATH, briefing);
}

/**
 * Sammelt Wetter-, News- und Kalenderdaten, lässt Claude daraus einen
 * kurzen Morgen-Text formulieren und speichert das Ergebnis für die
 * spätere Anzeige. Mit `notify: true` (z. B. im Cron-Job) wird zusätzlich
 * eine Push-Benachrichtigung mit Teaser-Text an alle angemeldeten Geräte
 * verschickt.
 */
export async function generateAndStoreMorningBriefing(
  accessToken?: string,
  options?: { notify?: boolean },
): Promise<MorningBriefing | null> {
  const [weather, news, events] = await Promise.all([
    getMainzWeather(),
    getAllNews(5),
    accessToken ? getUpcomingEvents(accessToken) : Promise.resolve([]),
  ]);

  const dataSummary = buildDataSummary(weather, news, events);

  try {
    const text = await callClaude(dataSummary);
    if (!text) return null;

    const briefing: MorningBriefing = {
      text,
      generatedAt: new Date().toISOString(),
    };

    await saveBriefing(briefing);

    if (options?.notify) {
      try {
        await sendBriefingPushNotification(briefing.text);
      } catch (error) {
        // Push-Fehler sollen das frisch erstellte Briefing nicht ungültig machen.
        console.error("Fehler beim Versenden der Push-Benachrichtigung", error);
      }
    }

    return briefing;
  } catch (error) {
    console.error("Fehler beim Erstellen des Morgenbriefings", error);
    return null;
  }
}

export async function getStoredMorningBriefing(): Promise<MorningBriefing | null> {
  return readJsonBlob<MorningBriefing>(BRIEFING_BLOB_PATH);
}
