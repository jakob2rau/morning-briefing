import { IconCalendarEvent } from "@tabler/icons-react";
import { formatEventTime, type CalendarEvent } from "@/lib/calendar";

type Props = {
  // Bereits auf den heutigen Kalendertag gefiltert (siehe
  // getTodaysEvents in src/lib/calendar.ts).
  events: CalendarEvent[];
};

// Rein präsentational, keine Interaktivität - bewusst kein Client
// Component.
export default function TerminCard({ events }: Props) {
  return (
    <div className="rounded-3xl bg-zinc-50 p-6 text-left shadow-sm shadow-zinc-200/60">
      <div className="flex items-center gap-2">
        <IconCalendarEvent size={18} stroke={1.75} className="text-zinc-500" />
        <p className="text-sm font-medium text-zinc-900">Termine heute</p>
      </div>

      {events.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Keine Termine heute</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600">
            {events.length} {events.length === 1 ? "Termin" : "Termine"} heute
          </p>
          <ul className="mt-2 space-y-1">
            {events.slice(0, 2).map((event) => (
              <li key={event.id} className="text-sm text-zinc-800">
                <span className="font-medium">{formatEventTime(event)}</span>
                {" · "}
                {event.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
