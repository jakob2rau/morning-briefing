"use client";

import { useState, useTransition } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { saveSettingsAction } from "@/app/settings/actions";
import {
  NEWS_CATEGORY_ORDER,
  CATEGORIES,
  type NewsCategoryId,
} from "@/lib/categories";
import { CATEGORY_ICON, CATEGORY_COLORS } from "@/components/categoryVisuals";
import type { AppSettings } from "@/lib/settings";

const inputClass =
  "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

type Props = {
  initialSettings: AppSettings;
};

export default function SettingsForm({ initialSettings }: Props) {
  const [cityName, setCityName] = useState(initialSettings.weather.cityName);
  const [feeds, setFeeds] = useState<Record<NewsCategoryId, string[]>>(
    initialSettings.feeds,
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateFeed(id: NewsCategoryId, index: number, value: string) {
    setFeeds((current) => ({
      ...current,
      [id]: current[id].map((url, i) => (i === index ? value : url)),
    }));
  }

  function addFeed(id: NewsCategoryId) {
    setFeeds((current) => ({ ...current, [id]: [...current[id], ""] }));
  }

  function removeFeed(id: NewsCategoryId, index: number) {
    setFeeds((current) => ({
      ...current,
      [id]: current[id].filter((_, i) => i !== index),
    }));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await saveSettingsAction({
          cityName,
          feeds: Object.fromEntries(
            NEWS_CATEGORY_ORDER.map((id) => [
              id,
              feeds[id].filter((url) => url.trim()),
            ]),
          ) as Record<NewsCategoryId, string[]>,
        });

        if (result.error) setError(result.error);
        else setSaved(true);
      } catch (err) {
        console.error("Fehler beim Speichern der Einstellungen", err);
        setError(
          "Die Anfrage ist fehlgeschlagen. Lade die Seite neu und versuch es erneut.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl bg-zinc-50 p-6 shadow-sm shadow-zinc-200/60">
        <label htmlFor="city" className="text-sm font-medium text-zinc-500">
          Stadt (für Wetter)
        </label>
        <input
          id="city"
          type="text"
          value={cityName}
          onChange={(event) => setCityName(event.target.value)}
          className={`mt-2 ${inputClass}`}
        />
      </section>

      {NEWS_CATEGORY_ORDER.map((id) => {
        const Icon = CATEGORY_ICON[id];
        const colors = CATEGORY_COLORS[id];

        return (
          <section
            key={id}
            className="rounded-3xl bg-zinc-50 p-6 shadow-sm shadow-zinc-200/60"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.badgeBg}`}
              >
                <Icon size={18} stroke={1.75} className={colors.accent} />
              </span>
              <p className="text-sm font-medium text-zinc-900">
                {CATEGORIES[id].label}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {feeds[id].map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(event) => updateFeed(id, index, event.target.value)}
                    placeholder="https://…"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeFeed(id, index)}
                    aria-label="Feed entfernen"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-zinc-600 transition-colors hover:bg-black/10"
                  >
                    <IconX size={16} stroke={1.75} />
                  </button>
                </div>
              ))}
              {feeds[id].length === 0 && (
                <p className="text-xs text-zinc-400">
                  Keine Feeds - diese Kategorie liefert dann nur einen
                  Platzhaltertext.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => addFeed(id)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:underline"
            >
              <IconPlus size={14} stroke={1.75} /> Feed hinzufügen
            </button>
          </section>
        );
      })}

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Wird gespeichert…" : "Speichern"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {saved && !error && (
          <p className="mt-2 text-xs text-zinc-500">Gespeichert ✓</p>
        )}
      </div>
    </div>
  );
}
