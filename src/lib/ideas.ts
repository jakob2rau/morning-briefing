import Anthropic from "@anthropic-ai/sdk";
import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";

export type IdeaCategory = "app-idee" | "geschenk" | "sonstiges";

export const IDEA_CATEGORIES: readonly IdeaCategory[] = [
  "app-idee",
  "geschenk",
  "sonstiges",
];

export type Idea = {
  id: string;
  text: string;
  category: IdeaCategory;
  createdAt: string; // ISO
};

const IDEAS_BLOB_PATH = "ideas.json";

function isValidCategory(value: unknown): value is IdeaCategory {
  return (
    typeof value === "string" &&
    (IDEA_CATEGORIES as readonly string[]).includes(value)
  );
}

function isValidIdea(value: unknown): value is Idea {
  if (!value || typeof value !== "object") return false;
  const { id, text, category, createdAt } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof text === "string" &&
    isValidCategory(category) &&
    typeof createdAt === "string"
  );
}

function normalizeIdeas(value: unknown): Idea[] {
  return Array.isArray(value) ? value.filter(isValidIdea) : [];
}

export async function getIdeas(): Promise<Idea[]> {
  const raw = await readJsonBlob<unknown>(IDEAS_BLOB_PATH);
  return normalizeIdeas(raw);
}

async function saveIdeas(ideas: Idea[]): Promise<void> {
  await writeJsonBlob(IDEAS_BLOB_PATH, ideas);
}

// Wie bei tasks.ts: read-modify-write ohne Locking, bewusst einfach für
// diese Ein-Nutzer-App.

export async function addIdea(
  text: string,
  category: IdeaCategory,
): Promise<Idea[]> {
  const ideas = await getIdeas();
  const trimmed = text.trim();
  if (!trimmed) return ideas;

  const next: Idea = {
    id: crypto.randomUUID(),
    text: trimmed,
    category: isValidCategory(category) ? category : "sonstiges",
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...ideas];
  await saveIdeas(updated);
  return updated;
}

export async function deleteIdea(id: string): Promise<Idea[]> {
  const ideas = await getIdeas();
  const updated = ideas.filter((idea) => idea.id !== id);
  await saveIdeas(updated);
  return updated;
}

const BREAKDOWN_MODEL = "claude-haiku-4-5-20251001";
const BREAKDOWN_TOOL_NAME = "submit_steps";

const client = new Anthropic();

/**
 * Zerlegt eine Idee per Claude Haiku in 2-4 konkrete, direkt umsetzbare
 * nächste Schritte. WICHTIG: Das ist der einzige Ort im Aufgaben/Ideen-
 * Bereich, der die Claude API aufruft - und nur, weil er explizit aus
 * suggestIdeaStepsAction() (app/actions.ts) heraus aufgerufen wird, also
 * nur bei Klick auf "In Aufgaben umwandeln". Normales Anlegen/Anzeigen/
 * Abhaken/Löschen von Aufgaben und Ideen ruft diese Funktion nie auf.
 */
export async function suggestStepsForIdea(
  ideaText: string,
): Promise<string[] | null> {
  try {
    const response = await client.messages.create({
      model: BREAKDOWN_MODEL,
      max_tokens: 512,
      system:
        "Du zerlegst eine kurze Idee oder einen Gedanken in 2 bis 4 " +
        "konkrete, direkt umsetzbare nächste Schritte auf Deutsch. Jeder " +
        "Schritt ist ein kurzer, eigenständiger To-Do-Eintrag (Imperativ " +
        "oder Substantiv-Stil) - kein vollständiger Satz, keine " +
        "Erklärung. Rufe dafür das Tool " +
        `"${BREAKDOWN_TOOL_NAME}" auf.`,
      tools: [
        {
          name: BREAKDOWN_TOOL_NAME,
          description: "Liefert 2-4 konkrete nächste Schritte für eine Idee.",
          input_schema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 4,
              },
            },
            required: ["steps"],
          },
        },
      ],
      tool_choice: { type: "tool", name: BREAKDOWN_TOOL_NAME },
      messages: [{ role: "user", content: `Idee:\n\n${ideaText}` }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use" && block.name === BREAKDOWN_TOOL_NAME,
    );
    if (!toolUse) return null;

    const rawSteps = (toolUse.input as { steps?: unknown })?.steps;
    if (!Array.isArray(rawSteps)) return null;

    const steps = rawSteps
      .map((step) => (typeof step === "string" ? step.trim() : ""))
      .filter(Boolean)
      .slice(0, 4);

    return steps.length > 0 ? steps : null;
  } catch (error) {
    console.error("Fehler beim Zerlegen der Idee in Schritte", error);
    return null;
  }
}
