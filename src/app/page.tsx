import Link from "next/link";
import { redirect } from "next/navigation";
import { IconSettings } from "@tabler/icons-react";
import { auth } from "@/auth";
import {
  generateAndStoreMorningBriefing,
  getStoredMorningBriefing,
} from "@/lib/briefing";
import { getStoredSettings } from "@/lib/settings";
import { getStreak, isDoneToday } from "@/lib/streak";
import { getUpcomingEventCountdowns } from "@/lib/specialEvents";
import { getUpcomingEvents, getTodaysEvents } from "@/lib/calendar";
import { getTasks } from "@/lib/tasks";
import { getIdeas } from "@/lib/ideas";
import BriefingOverview from "@/components/BriefingOverview";
import RegenerateBriefingButton from "@/components/RegenerateBriefingButton";
import SpecialEventCountdowns from "@/components/SpecialEventCountdowns";
import TerminCard from "@/components/TerminCard";
import StreakBadge from "@/components/StreakBadge";
import HomeTabs from "@/components/HomeTabs";
import TasksIdeasSection from "@/components/TasksIdeasSection";

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
  // Zusätzlich zu proxy.ts (Defense-in-Depth, siehe dortigen Kommentar
  // und lib/authGuard.ts) - proxy.ts deckt diese Seite bereits ab, aber
  // Next.js empfiehlt ausdrücklich, sich nicht allein darauf zu
  // verlassen.
  if (!session?.user) redirect("/signin");

  let briefing = await getStoredMorningBriefing();
  if (!briefing) {
    briefing = (await generateAndStoreMorningBriefing(session?.accessToken))
      .briefing;
  }

  const [settings, streak, todaysEvents, tasks, ideas] = await Promise.all([
    getStoredSettings(),
    getStreak(),
    session?.accessToken
      ? getUpcomingEvents(session.accessToken, 10).then(getTodaysEvents)
      : Promise.resolve([]),
    getTasks(),
    getIdeas(),
  ]);
  const countdowns = getUpcomingEventCountdowns(settings.specialEvents);

  // Server-gerenderter Inhalt des "Briefing"-Tabs - wird unverändert als
  // Prop an die Client Component HomeTabs durchgereicht (siehe deren
  // Kommentar), damit der Tab-Wechsel selbst ohne Re-Fetch auskommt.
  const briefingContent = (
    <div className="text-left">
      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-sm font-medium text-zinc-500">
          {briefing
            ? `Erstellt am ${formatTimestamp(briefing.generatedAt)} Uhr`
            : "Dein Morgenbriefing"}
        </p>
        <RegenerateBriefingButton />
      </div>

      {session && (
        <div className="mt-4">
          <TerminCard events={todaysEvents} />
        </div>
      )}

      {countdowns.length > 0 && (
        <div className="mt-4">
          <SpecialEventCountdowns countdowns={countdowns} />
        </div>
      )}

      <div className="mt-4">
        {briefing ? (
          <BriefingOverview
            categories={briefing.categories}
            weather={briefing.weather}
            streak={{ count: streak.count, alreadyDoneToday: isDoneToday(streak) }}
            soundEffects={settings.soundEffects}
          />
        ) : (
          <p className="rounded-3xl bg-zinc-50 p-6 text-sm text-zinc-500">
            Dein Briefing konnte noch nicht erstellt werden. Versuch es über
            &quot;Neu erstellen&quot; erneut.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-white px-6 py-16 text-center">
      <div className="flex w-full max-w-2xl items-center gap-3">
        <StreakBadge count={streak.count} />
        <h1 className="flex-1 text-center text-3xl font-semibold tracking-tight text-zinc-900">
          Morning Briefing
        </h1>
        <Link
          href="/settings"
          aria-label="Einstellungen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-zinc-700 transition-colors hover:bg-black/10"
        >
          <IconSettings size={18} stroke={1.75} />
        </Link>
      </div>

      <HomeTabs
        briefingContent={briefingContent}
        tasksIdeasContent={
          <TasksIdeasSection initialTasks={tasks} initialIdeas={ideas} />
        }
      />
    </div>
  );
}
