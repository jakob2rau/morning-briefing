"use client";

import { useState, useTransition } from "react";
import { IconBulb } from "@tabler/icons-react";
import { addIdeaAction } from "@/app/actions";
import { IDEA_CATEGORIES, type Idea, type IdeaCategory } from "@/lib/ideas";
import type { Task } from "@/lib/tasks";
import { IDEA_CATEGORY_COLORS, IDEA_CATEGORY_LABEL } from "@/components/ideaVisuals";
import IdeaCard from "@/components/IdeaCard";

type Props = {
  ideas: Idea[];
  onIdeasChange: (ideas: Idea[]) => void;
  onTasksConfirmed: (tasks: Task[]) => void;
};

export default function IdeasBoard({ ideas, onIdeasChange, onTasksConfirmed }: Props) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("sonstiges");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await addIdeaAction(trimmed, category);
      if (result.error || !result.ideas) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onIdeasChange(result.ideas);
      setText("");
    });
  }

  return (
    <section className="rounded-3xl bg-zinc-50 p-6 text-left shadow-sm shadow-zinc-200/60">
      <div className="flex items-center gap-2">
        <IconBulb size={18} stroke={1.75} className="text-zinc-500" />
        <p className="text-sm font-medium text-zinc-900">Ideen & Brainstorming</p>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Ein längerer Gedanke, eine Idee…"
        rows={3}
        className="mt-3 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {IDEA_CATEGORIES.map((id) => {
          const colors = IDEA_CATEGORY_COLORS[id];
          const active = category === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active ? `${colors.badgeBg} ${colors.accent}` : "bg-white text-zinc-500"
              }`}
            >
              {IDEA_CATEGORY_LABEL[id]}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !text.trim()}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Wird gespeichert…" : "Idee speichern"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {ideas.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Noch keine Ideen notiert.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onDeleted={onIdeasChange}
              onTasksConfirmed={onTasksConfirmed}
            />
          ))}
        </div>
      )}
    </section>
  );
}
