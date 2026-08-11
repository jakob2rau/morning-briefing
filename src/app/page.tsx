import { getMainzWeather } from "@/lib/weather";

export default async function Home() {
  const weather = await getMainzWeather();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 text-center dark:bg-zinc-900">
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
    </div>
  );
}
