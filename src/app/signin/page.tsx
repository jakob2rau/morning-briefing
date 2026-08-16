import { redirect } from "next/navigation";
import { IconSunrise } from "@tabler/icons-react";
import { auth, signIn } from "@/auth";

// Bekannte Auth.js-Fehlercodes (siehe pages.error in auth.ts) - grob
// zusammengefasst, da Auth.js hier absichtlich wenig Detail preisgibt.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Dieser Google-Account ist für diese App nicht freigeschaltet.",
  Configuration:
    "Die Anmeldung ist fehlgeschlagen (Serverkonfiguration). Versuch es gleich noch einmal.",
  Callback:
    "Die Anmeldung ist beim Zurückkommen von Google fehlgeschlagen. Versuch es gleich noch einmal.",
  OAuthCallback:
    "Die Anmeldung ist beim Zurückkommen von Google fehlgeschlagen. Versuch es gleich noch einmal.",
  OAuthSignin:
    "Die Anmeldung bei Google konnte nicht gestartet werden. Versuch es gleich noch einmal.",
};

const DEFAULT_ERROR_MESSAGE =
  "Die Anmeldung ist fehlgeschlagen. Versuch es gleich noch einmal.";

// Einzige öffentlich erreichbare Seite der App (siehe proxy.ts) - alles
// andere ist hinter der Google-Anmeldung gesperrt. Wer schon angemeldet
// ist und trotzdem hier landet, wird direkt weitergeleitet. Dient
// zusätzlich als pages.error (auth.ts) - ein OAuth-Fehler beim
// Zurückkommen von Google landet also ebenfalls hier statt auf NextAuth's
// eigener, unbekannter Fehlerseite.
export default async function SignInPage(props: PageProps<"/signin">) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { callbackUrl, error } = await props.searchParams;
  const redirectTo =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/")
      ? callbackUrl
      : "/";
  const errorMessage =
    typeof error === "string"
      ? (ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE)
      : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cat-wetter-badge">
        <IconSunrise size={30} stroke={1.75} className="text-cat-wetter-accent" />
      </span>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Morning Briefing
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Bitte melde dich an, um fortzufahren.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo });
        }}
      >
        <button
          type="submit"
          className="flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Mit Google anmelden
        </button>
      </form>

      {errorMessage && (
        <p className="max-w-xs text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
