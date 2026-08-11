import { auth, signIn, signOut } from "@/auth";
import { getMainzWeather } from "@/lib/weather";
import { getAllNews } from "@/lib/news";
import { getUpcomingEvents } from "@/lib/calendar";

function formatEventTime(event: { start: string; allDay: boolean }) {
  if (event.allDay) return "Ganztägig";
  return new Date(event.start).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export default async function Home() {
  const session = await auth();

  const [weather, news, events] = await Promise.all([
    getMainzWeather(),
    getAllNews(),
    session?.accessToken ? getUpcomingEvents(session.accessToken) : Promise.resolve([]),
  ]);

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

      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Wetter in Mainz
        </p>
        {weather ? (
          <>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="text-4xl" aria-hidden="true">
                {weather.icon}
              </span>
              <span className="text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
                {Math.round(weather.temperature)}°C
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {weather.description}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Wetterdaten aktuell nicht verfügbar.
          </p>
        )}
      </div>

      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Nächste Termine
          </p>
          {session && (
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
          )}
        </div>

        {!session ? (
          <div className="mt-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Melde dich mit Google an, um deine Termine zu sehen.
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
          </div>
        ) : events.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {formatEventTime(event)}
                </span>
                <span className="text-sm text-zinc-900 dark:text-zinc-50">
                  {event.title}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Keine anstehenden Termine.
          </p>
        )}
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
        {news.map((source) => (
          <div
            key={source.id}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-800"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {source.label}
            </p>
            {source.headlines.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {source.headlines.map((headline) => (
                  <li key={headline.link}>
                    <a
                      href={headline.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {headline.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Schlagzeilen aktuell nicht verfügbar.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
