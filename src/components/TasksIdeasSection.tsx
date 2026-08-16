"use client";

import { useState } from "react";
import type { Idea } from "@/lib/ideas";
import type { Task } from "@/lib/tasks";
import TodoList from "@/components/TodoList";
import IdeasBoard from "@/components/IdeasBoard";

type Props = {
  initialTasks: Task[];
  initialIdeas: Idea[];
};

// Container für den Tab "Aufgaben & Ideen" - hält die Listen als
// Client-State (initial vom Server geladen), damit Server-Action-Ergebnisse
// beide Sektionen ohne vollen Seiten-Reload aktualisieren können (z. B.
// landen die aus einer Idee erzeugten Aufgaben direkt in der To-Do-Liste).
export default function TasksIdeasSection({ initialTasks, initialIdeas }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);

  return (
    <div className="flex flex-col gap-4">
      <TodoList tasks={tasks} onTasksChange={setTasks} />
      <IdeasBoard ideas={ideas} onIdeasChange={setIdeas} onTasksConfirmed={setTasks} />
    </div>
  );
}
