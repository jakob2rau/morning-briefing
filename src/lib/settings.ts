import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";
import { NEWS_CATEGORY_ORDER, type NewsCategoryId } from "@/lib/categories";

export type WeatherLocation = {
  cityName: string;
  latitude: number;
  longitude: number;
};

export type AppSettings = {
  weather: WeatherLocation;
  feeds: Record<NewsCategoryId, string[]>;
};

const SETTINGS_BLOB_PATH = "app-settings.json";

// Einzige Quelle der Wahrheit für die Default-Werte (auch die
// Mainz-Koordinaten - weather.ts hält keine eigene Default-Location mehr).
export const DEFAULT_SETTINGS: AppSettings = {
  weather: { cityName: "Mainz", latitude: 49.9929, longitude: 8.2473 },
  feeds: {
    tech: ["https://techcrunch.com/feed/"],
    wirtschaft: [
      "https://www.tagesschau.de/wirtschaft/konjunktur/index~rss2.xml",
    ],
    politik: [
      "https://www.tagesschau.de/inland/innenpolitik/index~rss2.xml",
      "https://www.tagesschau.de/ausland/index~rss2.xml",
    ],
    sport: ["https://www.sportschau.de/index~rss2.xml"],
  },
};

function isValidUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function normalizeFeedList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const urls = value.filter(isValidUrl).map((url) => url.trim());
  return urls.length > 0 ? urls : fallback;
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

  return { weather, feeds };
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
