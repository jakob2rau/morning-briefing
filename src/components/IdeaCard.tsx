"use client";

import { useState, useTransition } from "react";
import { IconCheck, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import {
  confirmIdeaStepsAction,
  deleteIdeaAction,
  suggestIdeaStepsAction,
} from "@/app/actions";
import type { Idea } from "@/lib/ideas";
import type { Task } from "@/lib/tasks";
import { formatRelativeTime } from "@/lib/relativeTime";
import {
  IDEA_CATEGORY_COLORS,
  IDEA_CATEGORY_ICON,
  IDEA_CATEGORY_LABEL,
} from "@/components/ideaVisuals";

type Props = {
  idea: Idea;
  onDeleted: (ideas: Idea[]) => void;
  onTasksConfirmed: (tasks: Task[]) => void;
};

// Eine einzelne Idee inkl. "In Aufgaben umwandeln"-Flow: Klick ruft
// Claude auf und zeigt die vorgeschlagenen Schritte nur zur Bestätigung an
// (noch nicht gespeichert) - erst "Übernehmen" schreibt sie als neue
// Aufgaben. "Verwerfen" kostet nichts mehr, da der Claude-Aufruf bereits
// abgeschlossen ist.
export default function IdeaCard({ idea, onDeleted, onTasksConfirmed }: Props) {
  const [isPending, startTransition] = useTransition();
  const [steps, setSteps] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const colors = IDEA_CATEGORY_COLORS[idea.category];
  const Icon = IDEA_CATEGORY_ICON[idea.category];

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteIdeaAction(idea.id);
      if (result.error || !result.ideas) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onDeleted(result.ideas);
    });
  }

  function handleSuggest() {
    setError(null);
    startTransition(async () => {
      const result = await suggestIdeaStepsAction(idea.text);
      if (result.error || !result.steps) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      setSteps(result.steps);
    });
  }

  function handleConfirm() {
    if (!steps) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmIdeaStepsAction(steps);
      if (result.error || !result.tasks) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onTasksConfirmed(result.tasks);
      setSteps(null);
    });
  }

  return (
    <div className={`rounded-2xl p-4 shadow-sm shadow-zinc-200/40 ${colors.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.badgeBg}`}
          >
            <Icon size={13} stroke={1.75} className={colors.accent} />
          </span>
          <span className={`text-xs font-medium ${colors.accent}`}>
            {IDEA_CATEGORY_LABEL[idea.category]}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Idee löschen"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-600 disabled:opacity-50"
        >
          <IconTrash size={14} stroke={1.75} />
        </button>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{idea.text}</p>
      <p className="mt-2 text-xs text-zinc-500">
        {formatRelativeTime(idea.createdAt)}
      </p>

      {steps ? (
        <div className="mt-3 rounded-2xl bg-white/70 p-3">
          <p className="text-xs font-medium text-zinc-600">
            Vorgeschlagene Schritte:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {steps.map((step, index) => (
              <li key={index} className="text-sm text-zinc-800">
                • {step}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              <IconCheck size={14} stroke={2} /> Übernehmen
            </button>
            <button
              type="button"
              onClick={() => setSteps(null)}
              disabled={isPending}
              className="flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/10 disabled:opacity-50"
            >
              <IconX size={14} stroke={2} /> Verwerfen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSuggest}
          disabled={isPending}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-white disabled:opacity-50"
        >
          <IconSparkles size={14} stroke={1.75} />
          {isPending ? "Wird zerlegt…" : "In Aufgaben umwandeln"}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
