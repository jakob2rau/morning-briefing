import { IconHourglass } from "@tabler/icons-react";
import type { EventCountdown } from "@/lib/specialEvents";

type Props = {
  countdowns: EventCountdown[];
};

// Rein präsentational, keine Interaktivität - bewusst kein Client
// Component, damit dafür kein zusätzliches JS ausgeliefert wird.
export default function SpecialEventCountdowns({ countdowns }: Props) {
  if (countdowns.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      {countdowns.map((event) => (
        <div
          key={`${event.name}-${event.date}`}
          className="flex items-center gap-3 rounded-2xl bg-cat-tag-bg px-4 py-3 text-left shadow-sm shadow-zinc-200/60"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cat-tag-badge">
            <IconHourglass size={16} stroke={1.75} className="text-cat-tag-accent" />
          </span>
          <p className="text-sm text-zinc-800">
            {event.daysUntil === 0 ? (
              <>
                Heute: <span className="font-semibold">{event.name}</span>
              </>
            ) : (
              <>
                Noch {event.daysUntil} {event.daysUntil === 1 ? "Tag" : "Tage"}{" "}
                bis: <span className="font-semibold">{event.name}</span>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
