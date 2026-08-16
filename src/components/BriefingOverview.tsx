"use client";

import { useState } from "react";
import type { BriefingCategory } from "@/lib/briefing";
import type { WeatherSummary } from "@/lib/weather";
import { CATEGORIES } from "@/lib/categories";
import { CATEGORY_COLORS, CATEGORY_ICON } from "@/components/categoryVisuals";
import CategoryStoryModal from "@/components/CategoryStoryModal";

type Props = {
  categories: BriefingCategory[];
  weather: WeatherSummary | null;
  streak: { count: number; alreadyDoneToday: boolean };
  soundEffects: boolean;
};

export default function BriefingOverview({
  categories,
  weather,
  streak,
  soundEffects,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (categories.length === 0) return null;

  return (
    <>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((category, index) => {
          const meta = CATEGORIES[category.id];
          const colors = CATEGORY_COLORS[category.id];
          const Icon = CATEGORY_ICON[category.id];

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={`flex flex-col gap-3 rounded-3xl p-5 text-left shadow-sm shadow-zinc-200/60 transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${colors.bg}`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${colors.badgeBg}`}
              >
                <Icon className={colors.accent} size={22} stroke={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  {meta.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {category.teaser}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <CategoryStoryModal
          categories={categories}
          weather={weather}
          streak={streak}
          soundEffects={soundEffects}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
