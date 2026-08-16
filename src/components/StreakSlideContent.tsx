"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IconSunrise } from "@tabler/icons-react";
import { markDayDoneAction } from "@/app/actions";
import { CATEGORY_COLORS } from "@/components/categoryVisuals";
import { playStreakChime } from "@/lib/chime";

type Props = {
  initialCount: number;
  alreadyDoneToday: boolean;
  soundEffects: boolean;
};

// Muss zur längsten CSS-Animationsdauer in globals.css passen
// (streak-icon-bounce / streak-icon-wobble: 1.7s) plus etwas Puffer.
const ANIMATION_MS = 1750;

const RAY_COUNT = 8;

// Acht strahlenförmige Rays, die vom Icon-Zentrum nach außen rotieren und
// dabei ausblasen - der statische Winkel pro Ray wird über die
// CSS-Custom-Property "--ray-angle" ins gemeinsame Keyframe eingespeist
// (siehe .animate-streak-ray in globals.css), damit alle Rays dieselbe
// Animation mit unterschiedlicher Richtung nutzen können.
function SunRays() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <span
          key={i}
          className="animate-streak-ray absolute top-1/2 left-1/2 h-[3px] w-6 -translate-y-1/2 rounded-full bg-cat-wetter-accent/70"
          style={
            {
              "--ray-angle": `${(360 / RAY_COUNT) * i}deg`,
              animationDelay: `${i * 35}ms`,
              transformOrigin: "0% 50%",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// Der interaktive Inhalt der letzten Story-Slide ("Fertig für heute") -
// die Slide drumherum (CategoryStoryModal) liefert bereits den farbigen
// Hintergrund und die weiße Content-Karte, hier kommt nur noch das
// zentrierte Icon/Zahl/Button-Trio hinein.
export default function StreakSlideContent({
  initialCount,
  alreadyDoneToday,
  soundEffects,
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
      // Chime startet zusammen mit der Sonnenaufgangs-Animation (Rays +
      // Icon-Wobble + Zahl-Pop) - direkt aus diesem Klick-Handler heraus,
      // damit der Browser den AudioContext ohne Zusatz-Interaktion startet.
      if (soundEffects) playStreakChime();
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
        className={`relative flex h-20 w-20 items-center justify-center rounded-full ${colors.badgeBg} ${
          animate ? "animate-streak-icon" : ""
        }`}
      >
        {animate && <SunRays />}
        <IconSunrise
          size={36}
          stroke={1.75}
          className={`${colors.accent} ${animate ? "animate-streak-icon-wobble" : ""}`}
        />
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
