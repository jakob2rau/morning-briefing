"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import type { BriefingCategory } from "@/lib/briefing";
import type { WeatherSummary } from "@/lib/weather";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_COLORS, CATEGORY_ICON } from "@/components/categoryVisuals";
import WeatherStatsGrid from "@/components/WeatherStatsGrid";

type Props = {
  categories: BriefingCategory[];
  weather: WeatherSummary | null;
  initialIndex: number;
  onClose: () => void;
};

export default function CategoryStoryModal({
  categories,
  weather,
  initialIndex,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const canGoNext = index < categories.length - 1;

  function toggleItem(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function scrollToIndex(target: number, behavior: ScrollBehavior) {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: target * container.clientHeight, behavior });
  }

  function goPrev() {
    scrollToIndex(Math.max(index - 1, 0), "smooth");
  }

  function goNext() {
    scrollToIndex(Math.min(index + 1, categories.length - 1), "smooth");
  }

  // Beim Öffnen direkt zur angetippten Kategorie springen (ohne Animation).
  useEffect(() => {
    scrollToIndex(initialIndex, "instant");
    closeButtonRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktuellen Index anhand der Scroll-Position nachführen (für Pfeiltasten,
  // Auf/Ab-Button und Fokus - kein sichtbarer Fortschrittsbalken mehr).
  function handleScroll() {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    const nearest = Math.round(container.scrollTop / container.clientHeight);
    setIndex(Math.min(Math.max(nearest, 0), categories.length - 1));
  }

  // Hintergrund-Scroll sperren, solange das Modal offen ist.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Tastatursteuerung: Pfeiltasten (auf/ab und links/rechts) navigieren,
  // Escape schließt.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") goPrev();
      else if (event.key === "ArrowDown" || event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, categories.length]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-white">
      {/* Schließen-Button - schwebt fest über den Kategorien, scrollt nicht mit. */}
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-zinc-700 transition-colors hover:bg-black/10"
      >
        <IconX size={20} stroke={1.75} />
      </button>

      {/* Vertikale Kategorien-Seiten mit nativem Scroll-Snap - jede
          Kategorie eine volle Bildschirmhöhe, untereinander statt
          nebeneinander. */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex h-full snap-y snap-mandatory flex-col overflow-y-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => {
          const meta = CATEGORIES[category.id];
          const colors = CATEGORY_COLORS[category.id];
          const Icon = CATEGORY_ICON[category.id];

          return (
            <section
              key={category.id}
              aria-label={meta.label}
              className={`flex h-full w-full shrink-0 snap-start flex-col ${colors.bg}`}
            >
              {/* Icon-Anker: farbiger, abgerundeter Badge + Kategorie-Name
                  als kleines Label, freistehend auf dem Pastell-Hintergrund. */}
              <div className="flex items-center gap-3 px-7 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${colors.badgeBg}`}
                >
                  <Icon className={colors.accent} size={28} stroke={1.75} />
                </div>
                <span className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
                  {meta.label}
                </span>
              </div>

              {/* Abgerundete Content-Karte mit den einzelnen Meldungen als
                  optisch getrennte Blöcke. */}
              <div className="flex-1 overflow-y-auto rounded-t-[2rem] bg-white/95 px-7 pt-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
                <div className="mx-auto max-w-xl">
                  {category.id === "wetter" && (
                    <WeatherStatsGrid weather={weather} />
                  )}
                  <div className="divide-y divide-zinc-200">
                    {category.items.map((item, itemIndex) => {
                    const key = `${category.id}-${itemIndex}`;
                    const isExpanded = expandedKeys.has(key);

                    return (
                      <article
                        key={itemIndex}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => toggleItem(key)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleItem(key);
                          }
                        }}
                        className="cursor-pointer py-5 first:pt-0 last:pb-0 select-none"
                      >
                        <h3 className="text-lg leading-snug font-bold text-zinc-900">
                          {item.headline}
                        </h3>
                        <p className="mt-2 text-base leading-[1.7] whitespace-pre-line text-zinc-700">
                          {isExpanded ? item.expandedText : item.text}
                        </p>
                        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-zinc-400">
                          <span>{isExpanded ? "Weniger anzeigen" : "Mehr lesen"}</span>
                          <IconChevronDown
                            size={16}
                            stroke={2}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-2 inline-block text-sm font-medium text-zinc-500 hover:underline"
                        >
                          Quelle: {item.sourceLabel}
                        </a>
                      </article>
                    );
                  })}
                </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Dezenter Hinweis auf weitere Kategorien unterhalb. */}
      {canGoNext && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Nächste Kategorie"
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white/70 text-zinc-700 shadow-sm transition-colors hover:bg-white"
        >
          <IconChevronDown size={20} stroke={1.75} />
        </button>
      )}
    </div>
  );
}
