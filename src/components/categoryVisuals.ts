// Präsentations-Mapping: Icon + Pastellfarben pro Kategorie. Bewusst von
// src/lib/categories.ts getrennt, damit das reine Datenmodul (vom Server
// für den Claude-Prompt genutzt) keine UI-Abhängigkeiten braucht.

import {
  IconSunHigh,
  IconCpu,
  IconTrendingUp,
  IconBuildingBank,
  IconBallFootball,
  type Icon,
} from "@tabler/icons-react";
import type { BriefingCategoryId } from "@/lib/categories";

export const CATEGORY_ICON: Record<BriefingCategoryId, Icon> = {
  wetter: IconSunHigh,
  tech: IconCpu,
  wirtschaft: IconTrendingUp,
  politik: IconBuildingBank,
  sport: IconBallFootball,
};

export type CategoryColors = {
  // Kartenhintergrund in der Übersicht + Story-Hintergrund.
  bg: string;
  // Badge-Hintergrund fürs Icon in der Übersichtskarte.
  badgeBg: string;
  // Akzentfarbe für Icon/Fortschrittsbalken.
  accent: string;
};

export const CATEGORY_COLORS: Record<BriefingCategoryId, CategoryColors> = {
  wetter: {
    bg: "bg-cat-wetter-bg",
    badgeBg: "bg-cat-wetter-badge",
    accent: "text-cat-wetter-accent",
  },
  tech: {
    bg: "bg-cat-tech-bg",
    badgeBg: "bg-cat-tech-badge",
    accent: "text-cat-tech-accent",
  },
  wirtschaft: {
    bg: "bg-cat-wirtschaft-bg",
    badgeBg: "bg-cat-wirtschaft-badge",
    accent: "text-cat-wirtschaft-accent",
  },
  politik: {
    bg: "bg-cat-politik-bg",
    badgeBg: "bg-cat-politik-badge",
    accent: "text-cat-politik-accent",
  },
  sport: {
    bg: "bg-cat-sport-bg",
    badgeBg: "bg-cat-sport-badge",
    accent: "text-cat-sport-accent",
  },
};
