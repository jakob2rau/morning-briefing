// Präsentations-Mapping für Ideen-Kategorien - analog zu
// categoryVisuals.ts, aber für IdeaCategory (src/lib/ideas.ts) statt
// BriefingCategoryId.

import {
  IconDeviceMobile,
  IconGift,
  IconSparkles,
  type Icon,
} from "@tabler/icons-react";
import type { IdeaCategory } from "@/lib/ideas";

export const IDEA_CATEGORY_LABEL: Record<IdeaCategory, string> = {
  "app-idee": "App-Idee",
  geschenk: "Geschenk",
  sonstiges: "Sonstiges",
};

export const IDEA_CATEGORY_ICON: Record<IdeaCategory, Icon> = {
  "app-idee": IconDeviceMobile,
  geschenk: IconGift,
  sonstiges: IconSparkles,
};

export type IdeaCategoryColors = {
  bg: string;
  badgeBg: string;
  accent: string;
};

export const IDEA_CATEGORY_COLORS: Record<IdeaCategory, IdeaCategoryColors> = {
  "app-idee": {
    bg: "bg-cat-idea-app-bg",
    badgeBg: "bg-cat-idea-app-badge",
    accent: "text-cat-idea-app-accent",
  },
  geschenk: {
    bg: "bg-cat-idea-geschenk-bg",
    badgeBg: "bg-cat-idea-geschenk-badge",
    accent: "text-cat-idea-geschenk-accent",
  },
  sonstiges: {
    bg: "bg-cat-idea-sonstiges-bg",
    badgeBg: "bg-cat-idea-sonstiges-badge",
    accent: "text-cat-idea-sonstiges-accent",
  },
};
