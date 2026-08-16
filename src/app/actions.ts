"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/authGuard";
import { generateAndStoreMorningBriefing } from "@/lib/briefing";
import { markDoneToday, type StreakData } from "@/lib/streak";
import {
  addTask,
  addTasksBulk,
  toggleTask,
  deleteTask,
  archiveDoneTasks,
  type Task,
} from "@/lib/tasks";
import type { Idea, IdeaCategory } from "@/lib/ideas";
import { addIdea, deleteIdea, suggestStepsForIdea } from "@/lib/ideaStore";

// Jede Aktion hier prüft zuerst requireSession() - zusätzlich zu proxy.ts
// (Defense-in-Depth, siehe Kommentar dort und in lib/authGuard.ts). Ohne
// gültige Session passiert nichts, es wird nur der generische
// "Nicht angemeldet"-Fehler zurückgegeben.
const NOT_SIGNED_IN_ERROR = "Nicht angemeldet.";

export type RegenerateResult = { error: string | null };

export async function regenerateBriefing(): Promise<RegenerateResult> {
  const session = await requireSession();
  if (!session) return { error: NOT_SIGNED_IN_ERROR };

  const result = await generateAndStoreMorningBriefing(session.accessToken);

  if (!result.briefing) {
    // Absichtlich die generische Meldung hier - der konkrete Fehlertext
    // (result.error) landet nur im Server-Log bzw. in der CRON_SECRET-
    // geschützten API-Route, nicht direkt in dieser öffentlichen UI.
    return {
      error:
        "Das Briefing konnte nicht neu erstellt werden. Versuch es gleich noch einmal.",
    };
  }

  revalidatePath("/");
  return { error: null };
}

export type MarkDayDoneResult =
  | { streak: StreakData; error: null }
  | { streak: null; error: string };

/**
 * Trägt den heutigen Tag im Streak-Zähler als erledigt ein (siehe
 * src/lib/streak.ts für die "in Folge"-Logik inkl. Schutz vor doppelter
 * Erhöhung bei mehrfachem Klick am selben Tag).
 */
export async function markDayDoneAction(): Promise<MarkDayDoneResult> {
  if (!(await requireSession())) {
    return { streak: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const streak = await markDoneToday();
    revalidatePath("/");
    return { streak, error: null };
  } catch (error) {
    console.error("Fehler beim Speichern des Tages-Status", error);
    return {
      streak: null,
      error: "Konnte nicht gespeichert werden. Versuch es gleich noch einmal.",
    };
  }
}

// --- Aufgaben & Ideen -------------------------------------------------
//
// Alle Aktionen hier sind reine Lese-/Schreibzugriffe auf die beiden Blobs
// (tasks.json, ideas.json) - OHNE Claude-API-Aufruf. Die einzige Ausnahme
// ist suggestIdeaStepsAction() weiter unten, die explizit nur beim Klick
// auf "In Aufgaben umwandeln" ausgelöst wird.

const TASKS_IDEAS_GENERIC_ERROR =
  "Die Anfrage ist fehlgeschlagen. Versuch es gleich noch einmal.";

export type TasksResult =
  | { tasks: Task[]; error: null }
  | { tasks: null; error: string };

export type IdeasResult =
  | { ideas: Idea[]; error: null }
  | { ideas: null; error: string };

export type StepsResult =
  | { steps: string[]; error: null }
  | { steps: null; error: string };

export async function addTaskAction(text: string): Promise<TasksResult> {
  if (!(await requireSession())) {
    return { tasks: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const tasks = await addTask(text);
    revalidatePath("/");
    return { tasks, error: null };
  } catch (error) {
    console.error("Fehler beim Anlegen der Aufgabe", error);
    return { tasks: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

export async function toggleTaskAction(id: string): Promise<TasksResult> {
  if (!(await requireSession())) {
    return { tasks: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const tasks = await toggleTask(id);
    revalidatePath("/");
    return { tasks, error: null };
  } catch (error) {
    console.error("Fehler beim Abhaken der Aufgabe", error);
    return { tasks: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

export async function deleteTaskAction(id: string): Promise<TasksResult> {
  if (!(await requireSession())) {
    return { tasks: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const tasks = await deleteTask(id);
    revalidatePath("/");
    return { tasks, error: null };
  } catch (error) {
    console.error("Fehler beim Löschen der Aufgabe", error);
    return { tasks: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

export async function archiveDoneTasksAction(): Promise<TasksResult> {
  if (!(await requireSession())) {
    return { tasks: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const tasks = await archiveDoneTasks();
    revalidatePath("/");
    return { tasks, error: null };
  } catch (error) {
    console.error("Fehler beim Archivieren erledigter Aufgaben", error);
    return { tasks: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

export async function addIdeaAction(
  text: string,
  category: IdeaCategory,
): Promise<IdeasResult> {
  if (!(await requireSession())) {
    return { ideas: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const ideas = await addIdea(text, category);
    revalidatePath("/");
    return { ideas, error: null };
  } catch (error) {
    console.error("Fehler beim Speichern der Idee", error);
    return { ideas: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

export async function deleteIdeaAction(id: string): Promise<IdeasResult> {
  if (!(await requireSession())) {
    return { ideas: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const ideas = await deleteIdea(id);
    revalidatePath("/");
    return { ideas, error: null };
  } catch (error) {
    console.error("Fehler beim Löschen der Idee", error);
    return { ideas: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}

/**
 * Einziger Ort, an dem für "Aufgaben & Ideen" die Claude API aufgerufen
 * wird (siehe suggestStepsForIdea in lib/ideas.ts) - ausschließlich bei
 * explizitem Klick auf "In Aufgaben umwandeln". Persistiert noch NICHTS;
 * die Schritte werden erst nach Bestätigung durch confirmIdeaStepsAction()
 * unten als echte Aufgaben übernommen.
 */
export async function suggestIdeaStepsAction(
  ideaText: string,
): Promise<StepsResult> {
  if (!(await requireSession())) {
    return { steps: null, error: NOT_SIGNED_IN_ERROR };
  }

  const trimmed = ideaText.trim();
  if (!trimmed) {
    return { steps: null, error: "Die Idee ist leer." };
  }

  const steps = await suggestStepsForIdea(trimmed);
  if (!steps) {
    return {
      steps: null,
      error: "Konnte keine Schritte vorschlagen. Versuch es gleich noch einmal.",
    };
  }
  return { steps, error: null };
}

export async function confirmIdeaStepsAction(
  steps: string[],
): Promise<TasksResult> {
  if (!(await requireSession())) {
    return { tasks: null, error: NOT_SIGNED_IN_ERROR };
  }

  try {
    const tasks = await addTasksBulk(steps);
    revalidatePath("/");
    return { tasks, error: null };
  } catch (error) {
    console.error("Fehler beim Übernehmen der Schritte als Aufgaben", error);
    return { tasks: null, error: TASKS_IDEAS_GENERIC_ERROR };
  }
}
