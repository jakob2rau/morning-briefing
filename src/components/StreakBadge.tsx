import { IconSunrise } from "@tabler/icons-react";

type Props = {
  count: number;
};

// Dezenter Hinweis auf den aktuellen Streak, oben in der gegenüberliegenden
// Ecke zum Zahnrad-Icon - der eigentliche "Fertig für heute"-Button lebt
// als letzte Slide in der Story-Ansicht (CategoryStoryModal), nicht hier.
export default function StreakBadge({ count }: Props) {
  return (
    <div
      className="absolute top-0 left-1 flex items-center gap-1 text-xs font-medium text-zinc-500"
      aria-label={`${count} Sonnenaufgänge in Folge`}
    >
      <IconSunrise size={16} stroke={1.75} className="text-cat-wetter-accent" />
      <span>{count}</span>
    </div>
  );
}
