"use client";

import { useEffect, useRef, useState } from "react";
import { IconSunrise } from "@tabler/icons-react";
import { markDayDoneAction } from "@/app/actions";
import { CATEGORY_COLORS } from "@/components/categoryVisuals";

type Props = {
  initialCount: number;
  alreadyDoneToday: boolean;
};

// Muss zur CSS-Animationsdauer in globals.css passen (streak-icon-bounce /
// streak-glow-pulse: 0.7s).
const ANIMATION_MS = 700;

// Der interaktive Inhalt der letzten Story-Slide ("Fertig für heute") -
// die Slide drumherum (CategoryStoryModal) liefert bereits den farbigen
// Hintergrund und die weiße Content-Karte, hier kommt nur noch das
// zentrierte Icon/Zahl/Button-Trio hinein.
export default function StreakSlideContent({
  initialCount,
  alreadyDoneToday,
}: Props) {
  const [count, setCount] = useState(initialCount);
  const [done, setDone] = useState(alreadyDoneToday);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleClick() {
    if (done || isPending) return;
    setError(null);
    setIsPending(true);

    try {
      const result = await markDayDoneAction();
      if (result.error || !result.streak) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }

      setCount(result.streak.count);
      setDone(true);
      setAnimate(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setAnimate(false), ANIMATION_MS);
    } catch (err) {
      console.error("Fehler beim Markieren des Tages als erledigt", err);
      setError(
        "Die Anfrage ist fehlgeschlagen. Lade die Seite neu und versuch es erneut.",
      );
    } finally {
      setIsPending(false);
    }
  }

  const colors = CATEGORY_COLORS.wetter;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span
        className={`flex h-20 w-20 items-center justify-center rounded-full ${colors.badgeBg} ${
          animate ? "animate-streak-icon" : ""
        }`}
      >
        <IconSunrise size={36} stroke={1.75} className={colors.accent} />
      </span>
      <p className="text-base text-zinc-700">
        <span
          className={`block text-3xl font-bold text-zinc-900 ${
            animate ? "animate-streak-count" : ""
          }`}
        >
          {count}
        </span>
        Sonnenaufgänge in Folge
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={done || isPending}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {done
          ? "Heute schon erledigt ✓"
          : isPending
            ? "Wird gespeichert…"
            : "Fertig für heute"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
