"use client";

import { useState, useTransition } from "react";
import { regenerateBriefing } from "@/app/actions";

export default function RegenerateBriefingButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await regenerateBriefing();
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        // Fängt auch Fehler ab, die vor unserem eigenen Code passieren -
        // z. B. eine von Next.js abgelehnte Server Action (CSRF-Check) oder
        // eine nach einem Deployment veraltete Action-ID auf einer noch
        // offenen, gecachten Seite.
        console.error("Fehler beim Neu-Erstellen des Briefings", err);
        setError(
          "Die Anfrage ist fehlgeschlagen. Lade die Seite neu und versuch es erneut.",
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="shrink-0 text-xs text-zinc-500 hover:underline disabled:opacity-50 dark:text-zinc-400"
      >
        {isPending ? "Wird aktualisiert…" : "Neu erstellen"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
