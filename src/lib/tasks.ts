import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";

export type Task = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string; // ISO
};

const TASKS_BLOB_PATH = "tasks.json";

function isValidTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const { id, text, done, createdAt } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof text === "string" &&
    typeof done === "boolean" &&
    typeof createdAt === "string"
  );
}

function normalizeTasks(value: unknown): Task[] {
  return Array.isArray(value) ? value.filter(isValidTask) : [];
}

export async function getTasks(): Promise<Task[]> {
  const raw = await readJsonBlob<unknown>(TASKS_BLOB_PATH);
  return normalizeTasks(raw);
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await writeJsonBlob(TASKS_BLOB_PATH, tasks);
}

// Alle folgenden Funktionen lesen den kompletten Blob, ändern ihn und
// schreiben ihn komplett zurück - für diese Ein-Nutzer-App ohne
// gleichzeitige Zugriffe bewusst ohne Locking (siehe auch settings.ts).

export async function addTask(text: string): Promise<Task[]> {
  const tasks = await getTasks();
  const trimmed = text.trim();
  if (!trimmed) return tasks;

  const next: Task = {
    id: crypto.randomUUID(),
    text: trimmed,
    done: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...tasks];
  await saveTasks(updated);
  return updated;
}

/**
 * Fügt mehrere Aufgaben auf einmal hinzu - genutzt beim Übernehmen der von
 * Claude vorgeschlagenen Schritte einer Idee (siehe suggestStepsForIdea in
 * src/lib/ideas.ts).
 */
export async function addTasksBulk(texts: string[]): Promise<Task[]> {
  const tasks = await getTasks();
  const now = new Date().toISOString();
  const newTasks: Task[] = texts
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: now,
    }));

  if (newTasks.length === 0) return tasks;
  const updated = [...newTasks, ...tasks];
  await saveTasks(updated);
  return updated;
}

export async function toggleTask(id: string): Promise<Task[]> {
  const tasks = await getTasks();
  const updated = tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task,
  );
  await saveTasks(updated);
  return updated;
}

export async function deleteTask(id: string): Promise<Task[]> {
  const tasks = await getTasks();
  const updated = tasks.filter((task) => task.id !== id);
  await saveTasks(updated);
  return updated;
}

/**
 * Entfernt alle erledigten Aufgaben auf einmal ("Archivieren") - es gibt
 * bewusst keine separate Archiv-Ansicht, die Aufgaben sind danach
 * endgültig weg. Das reine Ausblenden erledigter Aufgaben (ohne sie zu
 * löschen) passiert rein clientseitig in TodoList.tsx.
 */
export async function archiveDoneTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  const updated = tasks.filter((task) => !task.done);
  await saveTasks(updated);
  return updated;
}
