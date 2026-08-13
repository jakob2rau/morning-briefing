import {
  IconTemperature,
  IconArrowsMaximize,
  IconUmbrella,
  IconWind,
  IconDroplets,
  IconUvIndex,
  IconSunrise,
  type Icon,
} from "@tabler/icons-react";
import type { WeatherSummary } from "@/lib/weather";

type Props = {
  weather: WeatherSummary | null;
};

type Tile = {
  icon: Icon;
  value: string;
  label: string;
};

// Rein präsentational, keine Interaktivität - bewusst kein Client
// Component. Zeigt die Open-Meteo-Rohwerte als kompakte Kacheln
// (Icon + Zahl + Label), nicht als Fließtext - der von Claude
// geschriebene Beschreibungssatz kommt separat direkt darunter.
export default function WeatherStatsGrid({ weather }: Props) {
  if (!weather) return null;

  const tiles: Tile[] = [
    {
      icon: IconTemperature,
      value: `${Math.round(weather.apparentTemperature)}°`,
      label: "Gefühlt",
    },
    {
      icon: IconArrowsMaximize,
      value: `${Math.round(weather.minTemperature)}° / ${Math.round(weather.maxTemperature)}°`,
      label: "Min/Max",
    },
    {
      icon: IconUmbrella,
      value: `${Math.round(weather.precipitationProbability)}%`,
      label: "Regen",
    },
    {
      icon: IconWind,
      value: `${Math.round(weather.windSpeed)} km/h`,
      label: "Wind",
    },
    {
      icon: IconDroplets,
      value: `${Math.round(weather.humidity)}%`,
      label: "Feuchte",
    },
    {
      icon: IconUvIndex,
      value: `${Math.round(weather.uvIndex)}`,
      label: "UV-Index",
    },
    {
      icon: IconSunrise,
      value: `${weather.sunrise} / ${weather.sunset}`,
      label: "Sonne",
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((tile, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-50 px-2 py-3 text-center"
        >
          <tile.icon size={20} stroke={1.75} className="text-cat-wetter-accent" />
          <span className="text-sm font-semibold text-zinc-900">{tile.value}</span>
          <span className="text-[11px] text-zinc-500">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}
