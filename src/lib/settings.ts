import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";
import { NEWS_CATEGORY_ORDER, type NewsCategoryId } from "@/lib/categories";

export type WeatherLocation = {
  cityName: string;
  latitude: number;
  longitude: number;
};

export type SpecialEvent = {
  name: string;
  date: string; // ISO yyyy-mm-dd
};

export type AppSettings = {
  weather: WeatherLocation;
  feeds: Record<NewsCategoryId, string[]>;
  specialEvents: SpecialEvent[];
  // Kurzer Chime im Streak-Moment ("Fertig für heute") - siehe
  // src/lib/chime.ts. Default an, damit bestehende Blobs ohne dieses Feld
  // (siehe normalizeSettings) sich wie bisher plus Sound verhalten.
  soundEffects: boolean;
};

const SETTINGS_BLOB_PATH = "app-settings.json";

// Einzige Quelle der Wahrheit für die Default-Werte (auch die
// Mainz-Koordinaten - weather.ts hält keine eigene Default-Location mehr).
export const DEFAULT_SETTINGS: AppSettings = {
  weather: { cityName: "Mainz", latitude: 49.9929, longitude: 8.2473 },
  feeds: {
    tech: ["https://techcrunch.com/feed/"],
    // Der Konjunktur-Unterfeed aktualisiert sich nur alle paar Tage -
    // dadurch wirkten neu erstellte Briefings hier "veraltet" (dieselben
    // Meldungen wie tags zuvor), während die anderen Kategorien mit
    // breiteren Feeds echte News lieferten. Der allgemeine Wirtschafts-Feed
    // bekommt mehrmals täglich neue Artikel.
    wirtschaft: ["https://www.tagesschau.de/wirtschaft/index~rss2.xml"],
    politik: [
      "https://www.tagesschau.de/inland/innenpolitik/index~rss2.xml",
      "https://www.tagesschau.de/ausland/index~rss2.xml",
    ],
    sport: ["https://www.sportschau.de/index~rss2.xml"],
  },
  specialEvents: [],
  soundEffects: true,
};

function isValidUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function normalizeFeedList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const urls = value.filter(isValidUrl).map((url) => url.trim());
  return urls.length > 0 ? urls : fallback;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  // Rundtrip-Check über Date.UTC, damit z. B. "2026-02-30" (kalendarisch
  // ungültig) nicht durchrutscht - Date.UTC "korrigiert" solche Werte
  // sonst still auf den nächsten validen Tag.
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function normalizeSpecialEvents(value: unknown): SpecialEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): SpecialEvent | null => {
      if (!entry || typeof entry !== "object") return null;
      const { name, date } = entry as Record<string, unknown>;
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (!trimmedName || !isValidIsoDate(date)) return null;
      return { name: trimmedName, date };
    })
    .filter((event): event is SpecialEvent => event !== null);
}

/**
 * Validiert und normalisiert einen (untypisierten) Settings-Blob pro Feld
 * gegen `DEFAULT_SETTINGS` - anders als bei `isValidBriefing` in
 * briefing.ts nicht alles-oder-nichts: ein teilweise kaputter Blob (z. B.
 * gute Wetter-Daten, kaputte Feeds) verliert nicht die gültige Hälfte.
 */
export function normalizeSettings(value: unknown): AppSettings {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const rawWeather =
    raw.weather && typeof raw.weather === "object"
      ? (raw.weather as Record<string, unknown>)
      : {};

  const weather: WeatherLocation = {
    cityName:
      typeof rawWeather.cityName === "string" && rawWeather.cityName.trim()
        ? rawWeather.cityName.trim()
        : DEFAULT_SETTINGS.weather.cityName,
    latitude:
      typeof rawWeather.latitude === "number"
        ? rawWeather.latitude
        : DEFAULT_SETTINGS.weather.latitude,
    longitude:
      typeof rawWeather.longitude === "number"
        ? rawWeather.longitude
        : DEFAULT_SETTINGS.weather.longitude,
  };

  const rawFeeds =
    raw.feeds && typeof raw.feeds === "object"
      ? (raw.feeds as Record<string, unknown>)
      : {};

  const feeds = Object.fromEntries(
    NEWS_CATEGORY_ORDER.map((id) => [
      id,
      normalizeFeedList(rawFeeds[id], DEFAULT_SETTINGS.feeds[id]),
    ]),
  ) as Record<NewsCategoryId, string[]>;

  const specialEvents = normalizeSpecialEvents(raw.specialEvents);

  const soundEffects =
    typeof raw.soundEffects === "boolean"
      ? raw.soundEffects
      : DEFAULT_SETTINGS.soundEffects;

  return { weather, feeds, specialEvents, soundEffects };
}

/**
 * Liefert immer ein vollständiges `AppSettings` - Defaults, falls noch
 * nichts gespeichert wurde oder der Blob nicht (mehr) valide ist.
 */
export async function getStoredSettings(): Promise<AppSettings> {
  const raw = await readJsonBlob<unknown>(SETTINGS_BLOB_PATH);
  return normalizeSettings(raw);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeJsonBlob(SETTINGS_BLOB_PATH, settings);
}
