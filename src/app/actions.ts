"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateAndStoreMorningBriefing } from "@/lib/briefing";

export type RegenerateResult = { error: string | null };

export async function regenerateBriefing(): Promise<RegenerateResult> {
  const session = await auth();
  const result = await generateAndStoreMorningBriefing(session?.accessToken);

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
