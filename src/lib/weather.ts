export type WeatherSummary = {
  temperature: number;
  description: string;
  icon: string;
};

// WMO Weather interpretation codes, siehe https://open-meteo.com/en/docs
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Klarer Himmel", icon: "☀️" },
  1: { description: "Überwiegend klar", icon: "🌤️" },
  2: { description: "Teilweise bewölkt", icon: "⛅" },
  3: { description: "Bedeckt", icon: "☁️" },
  45: { description: "Nebel", icon: "🌫️" },
  48: { description: "Reifnebel", icon: "🌫️" },
  51: { description: "Leichter Nieselregen", icon: "🌦️" },
  53: { description: "Nieselregen", icon: "🌦️" },
  55: { description: "Starker Nieselregen", icon: "🌦️" },
  56: { description: "Gefrierender Nieselregen", icon: "🌧️" },
  57: { description: "Starker gefrierender Nieselregen", icon: "🌧️" },
  61: { description: "Leichter Regen", icon: "🌧️" },
  63: { description: "Regen", icon: "🌧️" },
  65: { description: "Starker Regen", icon: "🌧️" },
  66: { description: "Gefrierender Regen", icon: "🌧️" },
  67: { description: "Starker gefrierender Regen", icon: "🌧️" },
  71: { description: "Leichter Schneefall", icon: "❄️" },
  73: { description: "Schneefall", icon: "❄️" },
  75: { description: "Starker Schneefall", icon: "❄️" },
  77: { description: "Schneekörner", icon: "❄️" },
  80: { description: "Leichte Regenschauer", icon: "🌦️" },
  81: { description: "Regenschauer", icon: "🌦️" },
  82: { description: "Heftige Regenschauer", icon: "🌦️" },
  85: { description: "Leichte Schneeschauer", icon: "🌨️" },
  86: { description: "Starke Schneeschauer", icon: "🌨️" },
  95: { description: "Gewitter", icon: "⛈️" },
  96: { description: "Gewitter mit Hagel", icon: "⛈️" },
  99: { description: "Schweres Gewitter mit Hagel", icon: "⛈️" },
};

// Mainz
const LOCATION = { latitude: 49.9929, longitude: 8.2473 };

export async function getMainzWeather(): Promise<WeatherSummary | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(LOCATION.latitude),
      longitude: String(LOCATION.longitude),
      current: "temperature_2m,weather_code",
      timezone: "Europe/Berlin",
    });

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { next: { revalidate: 600 } }, // 10 Minuten cachen
    );

    if (!res.ok) return null;

    const data = await res.json();
    const temperature = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;

    if (typeof temperature !== "number") return null;

    const info = WEATHER_CODES[code] ?? { description: "Unbekannt", icon: "🌡️" };

    return { temperature, description: info.description, icon: info.icon };
  } catch {
    return null;
  }
}
