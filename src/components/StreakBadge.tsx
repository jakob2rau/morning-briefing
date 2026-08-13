import { IconSunrise } from "@tabler/icons-react";

type Props = {
  count: number;
};

// Dezenter Hinweis auf den aktuellen Streak, gespiegelt zum Zahnrad-Icon
// (gleiche Höhe/Optik wie dessen Kreis-Button). Normaler Flex-Kindelement
// im Header (nicht mehr absolut positioniert) - so bleibt der Abstand zur
// Überschrift garantiert korrekt, auch wenn die Zahl später zweistellig
// wird und die Badge dadurch breiter. Der eigentliche "Fertig für
// heute"-Button lebt als letzte Slide in der Story-Ansicht
// (CategoryStoryModal), nicht hier.
export default function StreakBadge({ count }: Props) {
  return (
    <div
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-black/5 px-3 text-zinc-700"
      aria-label={`${count} Sonnenaufgänge in Folge`}
    >
      <IconSunrise size={22} stroke={1.75} className="text-cat-wetter-accent" />
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}
