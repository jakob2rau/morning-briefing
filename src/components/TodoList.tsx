"use client";

import { useState, useTransition } from "react";
import {
  IconArchive,
  IconCheck,
  IconChecklist,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  addTaskAction,
  archiveDoneTasksAction,
  deleteTaskAction,
  toggleTaskAction,
} from "@/app/actions";
import type { Task } from "@/lib/tasks";

type Props = {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
};

// Das "erledigte ausblenden" ist bewusst reiner Client-State (kein
// Server-Roundtrip) - nur "archivieren" (= erledigte Aufgaben endgültig
// entfernen) und alle anderen Mutationen laufen über Server Actions.
export default function TodoList({ tasks, onTasksChange }: Props) {
  const [text, setText] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doneCount = tasks.filter((task) => task.done).length;
  const visibleTasks = showDone ? tasks : tasks.filter((task) => !task.done);

  function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await addTaskAction(trimmed);
      if (result.error || !result.tasks) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onTasksChange(result.tasks);
      setText("");
    });
  }

  function handleToggle(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await toggleTaskAction(id);
      if (result.error || !result.tasks) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onTasksChange(result.tasks);
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(id);
      if (result.error || !result.tasks) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onTasksChange(result.tasks);
    });
  }

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveDoneTasksAction();
      if (result.error || !result.tasks) {
        setError(result.error ?? "Unbekannter Fehler.");
        return;
      }
      onTasksChange(result.tasks);
    });
  }

  return (
    <section className="rounded-3xl bg-zinc-50 p-6 text-left shadow-sm shadow-zinc-200/60">
      <div className="flex items-center gap-2">
        <IconChecklist size={18} stroke={1.75} className="text-zinc-500" />
        <p className="text-sm font-medium text-zinc-900">To-Do</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
          placeholder="Neue Aufgabe…"
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !text.trim()}
          aria-label="Aufgabe hinzufügen"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          <IconPlus size={18} stroke={1.75} />
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">Noch keine Aufgaben.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visibleTasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm shadow-zinc-200/40"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={task.done}
                aria-label={task.done ? "Als offen markieren" : "Als erledigt markieren"}
                onClick={() => handleToggle(task.id)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  task.done
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300"
                }`}
              >
                {task.done && <IconCheck size={12} stroke={3} />}
              </button>
              <span
                className={`flex-1 text-sm ${
                  task.done ? "text-zinc-400 line-through" : "text-zinc-800"
                }`}
              >
                {task.text}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                aria-label="Aufgabe löschen"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-600"
              >
                <IconTrash size={14} stroke={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowDone((current) => !current)}
            className="text-xs font-medium text-zinc-500 hover:underline"
          >
            {showDone
              ? "Erledigte ausblenden"
              : `Erledigte anzeigen (${doneCount})`}
          </button>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:underline disabled:opacity-50"
            >
              <IconArchive size={14} stroke={1.75} /> Erledigte archivieren
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
