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

export default function StreakCard({ initialCount, alreadyDoneToday }: Props) {
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
    <div
      className={`w-full max-w-2xl rounded-3xl p-6 text-left shadow-sm shadow-zinc-200/60 ${colors.bg}`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${colors.badgeBg} ${
            animate ? "animate-streak-icon" : ""
          }`}
        >
          <IconSunrise size={28} stroke={1.75} className={colors.accent} />
        </span>
        <div>
          <p className="text-sm font-medium text-zinc-700">
            <span
              className={`inline-block text-xl font-semibold text-zinc-900 ${
                animate ? "animate-streak-count" : ""
              }`}
            >
              {count}
            </span>{" "}
            Sonnenaufgänge in Folge
          </p>
          <button
            type="button"
            onClick={handleClick}
            disabled={done || isPending}
            className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {done
              ? "Heute schon erledigt ✓"
              : isPending
                ? "Wird gespeichert…"
                : "Fertig für heute"}
          </button>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
