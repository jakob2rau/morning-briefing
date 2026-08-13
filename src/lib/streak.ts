import { readJsonBlob, writeJsonBlob } from "@/lib/blobStore";
import { todayBerlinIso, addDaysToIso } from "@/lib/berlinDate";

export type StreakData = {
  count: number;
  lastCompletedDate: string; // Europe/Berlin yyyy-mm-dd, "" wenn noch nie
};

const STREAK_BLOB_PATH = "streak.json";
const DEFAULT_STREAK: StreakData = { count: 0, lastCompletedDate: "" };

function isValidStreak(value: unknown): value is StreakData {
  if (!value || typeof value !== "object") return false;
  const { count, lastCompletedDate } = value as Record<string, unknown>;
  return typeof count === "number" && typeof lastCompletedDate === "string";
}

export async function getStreak(): Promise<StreakData> {
  const raw = await readJsonBlob<unknown>(STREAK_BLOB_PATH);
  return isValidStreak(raw) ? raw : DEFAULT_STREAK;
}

export function isDoneToday(streak: StreakData): boolean {
  return streak.lastCompletedDate === todayBerlinIso();
}

/**
 * Trägt den heutigen Tag als erledigt ein - echte "in Folge"-Semantik,
 * nicht nur ein reiner Zähler:
 * - Heute schon erledigt: No-op (verhindert doppelte Erhöhung bei
 *   wiederholtem Klick am selben Tag).
 * - Gestern erledigt (lückenlose Serie): +1.
 * - Älter als gestern oder noch nie erledigt: Serie beginnt neu bei 1.
 */
export async function markDoneToday(): Promise<StreakData> {
  const current = await getStreak();
  const today = todayBerlinIso();

  if (current.lastCompletedDate === today) {
    return current;
  }

  const yesterday = addDaysToIso(today, -1);
  const nextCount =
    current.lastCompletedDate === yesterday ? current.count + 1 : 1;
  const next: StreakData = { count: nextCount, lastCompletedDate: today };

  await writeJsonBlob(STREAK_BLOB_PATH, next);
  return next;
}
