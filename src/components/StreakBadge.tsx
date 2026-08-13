import { IconSunrise } from "@tabler/icons-react";

type Props = {
  count: number;
};

// Dezenter Hinweis auf den aktuellen Streak, gespiegelt zum Zahnrad-Icon
// (gleiche Höhe/Optik wie dessen Kreis-Button, oben links statt oben
// rechts) - der eigentliche "Fertig für heute"-Button lebt als letzte
// Slide in der Story-Ansicht (CategoryStoryModal), nicht hier.
export default function StreakBadge({ count }: Props) {
  return (
    <div
      className="absolute top-0 left-1 flex h-9 items-center gap-1.5 rounded-full bg-black/5 px-3 text-zinc-700"
      aria-label={`${count} Sonnenaufgänge in Folge`}
    >
      <IconSunrise size={22} stroke={1.75} className="text-cat-wetter-accent" />
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}
