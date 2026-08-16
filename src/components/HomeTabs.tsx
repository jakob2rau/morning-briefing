"use client";

import { useState, type ReactNode } from "react";
import { IconChecklist, IconNews } from "@tabler/icons-react";

type Tab = "briefing" | "tasks";

type Props = {
  // Server-gerenderter Inhalt beider Tabs, fertig vorbereitet in
  // page.tsx - HomeTabs selbst bleibt reine Anzeige-/Umschalt-Logik ohne
  // eigenen Datenzugriff.
  briefingContent: ReactNode;
  tasksIdeasContent: ReactNode;
};

// Beide Tab-Inhalte bleiben immer gemountet (nur per CSS "hidden"
// um-/ausgeblendet) statt bedingt gerendert zu werden - so geht beim
// Wechseln kein Client-State verloren (z. B. ein angefangener, noch nicht
// gespeicherter Aufgaben-/Ideen-Entwurf in TasksIdeasSection).
export default function HomeTabs({ briefingContent, tasksIdeasContent }: Props) {
  const [tab, setTab] = useState<Tab>("briefing");

  return (
    <div className="w-full max-w-2xl">
      <div className="mx-auto flex w-fit gap-1 rounded-full bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab("briefing")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "briefing"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <IconNews size={16} stroke={1.75} /> Briefing
        </button>
        <button
          type="button"
          onClick={() => setTab("tasks")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "tasks"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <IconChecklist size={16} stroke={1.75} /> Aufgaben & Ideen
        </button>
      </div>

      <div className={tab === "briefing" ? "mt-4" : "mt-4 hidden"}>
        {briefingContent}
      </div>
      <div className={tab === "tasks" ? "mt-4" : "mt-4 hidden"}>
        {tasksIdeasContent}
      </div>
    </div>
  );
}
