"use server";

import { revalidatePath } from "next/cache";
import { geocodeCity } from "@/lib/weather";
import { saveSettings, type AppSettings } from "@/lib/settings";
import { NEWS_CATEGORY_ORDER, type NewsCategoryId } from "@/lib/categories";

export type SaveSettingsInput = {
  cityName: string;
  feeds: Record<NewsCategoryId, string[]>;
};

export type SaveSettingsResult = { error: string | null };

function isValidUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Validiert und speichert die Einstellungen (Stadt + Feeds pro Kategorie)
 * dauerhaft im Vercel Blob Storage. Löst absichtlich KEINE Neu-Erstellung
 * des Briefings aus - die Einstellungen wirken erst beim nächsten
 * regulären Erstellen (Cron-Job oder "Neu erstellen").
 *
 * Gleiche Sicherheitsbasis wie `regenerateBriefing` in src/app/actions.ts:
 * kein Secret-Gate, nur Next.js' eingebauter Server-Action-Origin-Check -
 * konsistent mit dem Rest dieser Ein-Nutzer-App.
 */
export async function saveSettingsAction(
  input: SaveSettingsInput,
): Promise<SaveSettingsResult> {
  const cityName = input.cityName.trim();
  if (!cityName) {
    return { error: "Bitte gib eine Stadt an." };
  }

  const geocoded = await geocodeCity(cityName);
  if (!geocoded) {
    return { error: `Stadt "${cityName}" wurde nicht gefunden.` };
  }

  const feeds = Object.fromEntries(
    NEWS_CATEGORY_ORDER.map((id) => [
      id,
      (input.feeds[id] ?? [])
        .map((url) => url.trim())
        .filter((url) => url && isValidUrl(url)),
    ]),
  ) as Record<NewsCategoryId, string[]>;

  const settings: AppSettings = {
    weather: {
      cityName: geocoded.resolvedName || cityName,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    },
    feeds,
  };

  try {
    await saveSettings(settings);
  } catch (error) {
    console.error("Fehler beim Speichern der Einstellungen", error);
    return { error: "Die Einstellungen konnten nicht gespeichert werden." };
  }

  revalidatePath("/settings");
  return { error: null };
}
