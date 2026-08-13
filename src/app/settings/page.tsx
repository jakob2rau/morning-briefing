import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { auth, signIn, signOut } from "@/auth";
import { getStoredSettings } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";
import PushSubscribeButton from "@/components/PushSubscribeButton";

// Immer live aus dem Blob lesen statt beim Build einzufrieren - die Seite
// zeigt sonst nach dem ersten Deploy dauerhaft die Default-Werte, bis die
// nächste Speicherung `revalidatePath` auslöst.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, settings] = await Promise.all([auth(), getStoredSettings()]);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-6 py-16 text-center">
      <div className="w-full max-w-2xl text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline"
        >
          <IconArrowLeft size={16} stroke={1.75} /> Zurück
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          Einstellungen
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Diese Einstellungen werden beim nächsten Erstellen des
          Morgenbriefings verwendet.
        </p>
      </div>

      <div className="w-full max-w-2xl text-left">
        <SettingsForm initialSettings={settings} />
      </div>

      {/* Von der Startseite hierher verschoben (unverändert). */}
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
