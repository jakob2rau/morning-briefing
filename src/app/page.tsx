import { auth, signIn, signOut } from "@/auth";
import {
  generateAndStoreMorningBriefing,
  getStoredMorningBriefing,
} from "@/lib/briefing";
import BriefingOverview from "@/components/BriefingOverview";
import PushSubscribeButton from "@/components/PushSubscribeButton";
import RegenerateBriefingButton from "@/components/RegenerateBriefingButton";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function Home() {
  const session = await auth();

  let briefing = await getStoredMorningBriefing();
  if (!briefing) {
    briefing = (await generateAndStoreMorningBriefing(session?.accessToken))
      .briefing;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Morning Briefing
        </h1>
        <p className="mt-3 max-w-sm text-base text-zinc-600">
          Hier entsteht deine tägliche Briefing-App. Füge sie über &quot;Zum
          Home-Bildschirm&quot; deinem iPhone hinzu.
        </p>
      </div>

      <div className="w-full max-w-2xl text-left">
        <div className="flex items-center justify-between gap-4 px-1">
          <p className="text-sm font-medium text-zinc-500">
            {briefing
              ? `Erstellt am ${formatTimestamp(briefing.generatedAt)} Uhr`
              : "Dein Morgenbriefing"}
          </p>
          <RegenerateBriefingButton />
        </div>

        <div className="mt-4">
          {briefing ? (
            <BriefingOverview categories={briefing.categories} />
          ) : (
            <p className="rounded-3xl bg-zinc-50 p-6 text-sm text-zinc-500">
              Dein Briefing konnte noch nicht erstellt werden. Versuch es
              über &quot;Neu erstellen&quot; erneut.
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-3xl bg-zinc-50 p-6 text-left shadow-sm shadow-zinc-200/60">
        {!session ? (
          <>
            <p className="text-sm text-zinc-600">
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
                className="flex h-10 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Mit Google anmelden
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600">
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
                className="text-xs text-zinc-500 hover:underline"
              >
                Abmelden
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl rounded-3xl bg-zinc-50 p-6 text-left shadow-sm shadow-zinc-200/60">
        <p className="text-sm font-medium text-zinc-500">
          Benachrichtigungen
        </p>
        <p className="mt-1 text-sm text-zinc-600">
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
