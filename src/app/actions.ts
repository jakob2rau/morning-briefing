"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateAndStoreMorningBriefing } from "@/lib/briefing";

export type RegenerateResult = { error: string | null };

export async function regenerateBriefing(): Promise<RegenerateResult> {
  const session = await auth();
  const briefing = await generateAndStoreMorningBriefing(session?.accessToken);

  if (!briefing) {
    return {
      error:
        "Das Briefing konnte nicht neu erstellt werden. Versuch es gleich noch einmal.",
    };
  }

  revalidatePath("/");
  return { error: null };
}
