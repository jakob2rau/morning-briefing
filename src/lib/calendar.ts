import { todayBerlinIso } from "@/lib/berlinDate";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO-Datum/-Zeit
  allDay: boolean;
};

export function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return "ganztägig";
  return new Date(event.start).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

/**
 * Filtert auf Termine, die am heutigen Kalendertag (Europe/Berlin)
 * beginnen - `getUpcomingEvents` liefert sonst auch Termine von morgen
 * oder später, sobald für heute weniger als `limit` übrig sind.
 */
export function getTodaysEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = todayBerlinIso();
  return events.filter((event) => {
    const eventDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
    }).format(new Date(event.start));
    return eventDay === today;
  });
}

type GoogleCalendarApiEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
};

export async function getUpcomingEvents(
  accessToken: string,
  limit = 5,
): Promise<CalendarEvent[]> {
  try {
    const params = new URLSearchParams({
      timeMin: new Date().toISOString(),
      maxResults: String(limit),
      singleEvents: "true",
      orderBy: "startTime",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    const items: GoogleCalendarApiEvent[] = Array.isArray(data?.items)
      ? data.items
      : [];

    return items
      .slice(0, limit)
      .map((item) => {
        const start = item.start?.dateTime ?? item.start?.date;
        if (!start) return null;
        return {
          id: item.id ?? start,
          title: item.summary?.trim() || "(Ohne Titel)",
          start,
          allDay: !item.start?.dateTime,
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  } catch {
    return [];
  }
}
