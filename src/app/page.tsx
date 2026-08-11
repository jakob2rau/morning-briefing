import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "@/auth";
import {
  generateAndStoreMorningBriefing,
  getStoredMorningBriefing,
} from "@/lib/briefing";
import PushSubscribeButton from "@/components/PushSubscribeButton";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

async function regenerateBriefing() {
  "use server";
  const session = await auth();
  await generateAndStoreMorningBriefing(session?.accessToken);
  revalidatePath("/");
}

export default async function Home() {
  const session = await auth();

  let briefing = await getStoredMorningBriefing();
  if (!briefing) {
    briefing = await generateAndStoreMorningBriefing(session?.accessToken);
  }

  const paragraphs =
    briefing?.text.split(/\n\s*\n/).filter((p) => p.trim().length > 0) ?? [];

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 text-center dark:bg-zinc-900">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Morning Briefing
        </h1>
        <p className="mt-3 max-w-sm text-base text-zinc-600 dark:text-zinc-400">
          Hier entsteht deine tägliche Briefing-App. Füge sie über &quot;Zum
          Home-Bildschirm&quot; deinem iPhone hinzu.
        </p>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {briefing
              ? `Erstellt am ${formatTimestamp(briefing.generatedAt)} Uhr`
              : "Dein Morgenbriefing"}
          </p>
          <form action={regenerateBriefing}>
            <button
              type="submit"
              className="shrink-0 text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Neu erstellen
            </button>
          </form>
        </div>

        {paragraphs.length > 0 ? (
          <div className="mt-4 space-y-4 text-base leading-relaxed text-zinc-800 dark:text-zinc-100">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Dein Briefing konnte noch nicht erstellt werden. Versuch es über
            &quot;Neu erstellen&quot; erneut.
          </p>
        )}
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
        {!session ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Melde dich mit Google an, damit deine Kalendertermine ins
              Briefing einfließen.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
              className="mt-3"
            >
              <button
                type="submit"
                className="flex h-10 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Mit Google anmelden
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Mit Google angemeldet – Termine fließen ins Briefing ein.
            </p>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Abmelden
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Benachrichtigungen
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Erhalte eine kurze Push-Benachrichtigung, sobald morgens ein neues
          Briefing bereitsteht.
        </p>
        <div className="mt-3">
          <PushSubscribeButton />
        </div>
      </div>
    </div>
  );
}
