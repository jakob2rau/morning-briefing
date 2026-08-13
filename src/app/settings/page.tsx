import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { getStoredSettings } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";

// Immer live aus dem Blob lesen statt beim Build einzufrieren - die Seite
// zeigt sonst nach dem ersten Deploy dauerhaft die Default-Werte, bis die
// nächste Speicherung `revalidatePath` auslöst.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getStoredSettings();

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
    </div>
  );
}
