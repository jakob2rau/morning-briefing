"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import type { BriefingCategory } from "@/lib/briefing";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_COLORS, CATEGORY_ICON } from "@/components/categoryVisuals";

type Props = {
  categories: BriefingCategory[];
  initialIndex: number;
  onClose: () => void;
};

// Ab dieser Wisch-Distanz (in Pixeln) gilt eine Geste als "zur nächsten/
// vorherigen Kategorie wechseln" statt als Antippen/Zurückfedern.
const SWIPE_THRESHOLD = 80;

export default function CategoryStoryModal({
  categories,
  initialIndex,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);

  const canGoPrev = index > 0;
  const canGoNext = index < categories.length - 1;

  function goPrev() {
    setIndex((current) => Math.max(current - 1, 0));
  }

  function goNext() {
    setIndex((current) => Math.min(current + 1, categories.length - 1));
  }

  // Fokus auf den Schließen-Button beim Öffnen, Hintergrund-Scroll sperren.
  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Tastatursteuerung: Pfeiltasten navigieren, Escape schließt.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") goPrev();
      else if (event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  const TRANSITION_MS = 250;

  function applyTransform(x: number, animated: boolean) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animated
      ? `transform ${TRANSITION_MS}ms ease-out`
      : "none";
    track.style.transform = `translateX(${x}px)`;
  }

  function handleTouchStart(event: React.TouchEvent) {
    startXRef.current = event.touches[0].clientX;
    deltaXRef.current = 0;
  }

  function handleTouchMove(event: React.TouchEvent) {
    const deltaX = event.touches[0].clientX - startXRef.current;
    // An den Rändern nur gedämpft mitziehen statt "ins Leere" zu ziehen.
    const dampened =
      (deltaX > 0 && !canGoPrev) || (deltaX < 0 && !canGoNext)
        ? deltaX / 3
        : deltaX;
    deltaXRef.current = dampened;
    applyTransform(dampened, false);
  }

  function handleTouchEnd() {
    const deltaX = deltaXRef.current;
    deltaXRef.current = 0;

    const track = trackRef.current;
    const width = track?.clientWidth ?? window.innerWidth;

    if (deltaX <= -SWIPE_THRESHOLD && canGoNext) {
      // Aktuellen Text vollständig aus dem Bild schieben, dann erst auf
      // die nächste Kategorie wechseln und ohne Animation auf Position 0
      // zurücksetzen - vermeidet einen sichtbaren "Sprung" mitten in der
      // Rückfeder-Animation.
      applyTransform(-width, true);
      window.setTimeout(() => {
        goNext();
        applyTransform(0, false);
      }, TRANSITION_MS);
    } else if (deltaX >= SWIPE_THRESHOLD && canGoPrev) {
      applyTransform(width, true);
      window.setTimeout(() => {
        goPrev();
        applyTransform(0, false);
      }, TRANSITION_MS);
    } else {
      applyTransform(0, true);
    }
  }

  const current = categories[index];
  if (!current) return null;

  const meta = CATEGORIES[current.id];
  const colors = CATEGORY_COLORS[current.id];
  const Icon = CATEGORY_ICON[current.id];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.label}
      className={`fixed inset-0 z-50 flex flex-col ${colors.bg}`}
    >
      {/* Story-Fortschrittsbalken */}
      <div className="flex gap-1.5 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        {categories.map((category, i) => (
          <div
            key={category.id}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10"
          >
            <div
              className={`h-full rounded-full bg-black/40 transition-all duration-300 ${
                i <= index ? "w-full" : "w-0"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Kopfzeile */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Icon className={colors.accent} size={22} stroke={1.75} />
          <span className="text-sm font-semibold text-zinc-800">
            {meta.label}
          </span>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-zinc-700 transition-colors hover:bg-black/10"
        >
          <IconX size={20} stroke={1.75} />
        </button>
      </div>

      {/* Inhalt mit Swipe-Geste */}
      <div
        className="relative flex-1 touch-pan-y overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={trackRef}>
          <div className="mx-auto h-full max-w-xl overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
            <p className="text-lg leading-relaxed whitespace-pre-line text-zinc-800">
              {current.fullText}
            </p>
          </div>
        </div>

        {/* Desktop-Navigation (Maus) */}
        {canGoPrev && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Vorherige Kategorie"
            className="absolute top-1/2 left-2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-zinc-700 shadow-sm transition-colors hover:bg-white sm:flex"
          >
            <IconChevronLeft size={22} stroke={1.75} />
          </button>
        )}
        {canGoNext && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Nächste Kategorie"
            className="absolute top-1/2 right-2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-zinc-700 shadow-sm transition-colors hover:bg-white sm:flex"
          >
            <IconChevronRight size={22} stroke={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}
