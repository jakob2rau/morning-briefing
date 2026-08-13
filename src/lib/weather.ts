export type WeatherSummary = {
  temperature: number;
  apparentTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  precipitationProbability: number; // %
  windSpeed: number; // km/h
  humidity: number; // %
  uvIndex: number;
  sunrise: string; // "HH:MM"
  sunset: string; // "HH:MM"
  description: string;
  icon: string;
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// Open-Meteo liefert Sonnenauf-/-untergang als ISO-String in der
// angefragten Zeitzone (z. B. "2026-08-13T06:13") - nur die Uhrzeit
// behalten.
function timeOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length >= 16
    ? value.slice(11, 16)
    : fallback;
}

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

export async function getWeather(location: {
  latitude: number;
  longitude: number;
}): Promise<WeatherSummary | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
      daily:
        "temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset",
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

    return {
      temperature,
      apparentTemperature: numberOr(data?.current?.apparent_temperature, temperature),
      minTemperature: numberOr(data?.daily?.temperature_2m_min?.[0], temperature),
      maxTemperature: numberOr(data?.daily?.temperature_2m_max?.[0], temperature),
      precipitationProbability: numberOr(
        data?.daily?.precipitation_probability_max?.[0],
        0,
      ),
      windSpeed: numberOr(data?.current?.wind_speed_10m, 0),
      humidity: numberOr(data?.current?.relative_humidity_2m, 0),
      uvIndex: numberOr(data?.daily?.uv_index_max?.[0], 0),
      sunrise: timeOr(data?.daily?.sunrise?.[0], "–"),
      sunset: timeOr(data?.daily?.sunset?.[0], "–"),
      description: info.description,
      icon: info.icon,
    };
  } catch {
    return null;
  }
}

export type GeocodedCity = {
  latitude: number;
  longitude: number;
  resolvedName: string;
};

/**
 * Löst einen Städtenamen (aus den Einstellungen) einmalig zu Koordinaten
 * auf - über Open-Meteos kostenlose, unauthentifizierte Geocoding-API.
 * Liefert `null` bei keinem Treffer oder jedem Fehler; der Aufrufer zeigt
 * dann "Stadt nicht gefunden" statt eines kryptischen Fehlers.
 */
export async function geocodeCity(name: string): Promise<GeocodedCity | null> {
  try {
    const params = new URLSearchParams({
      name,
      count: "1",
      language: "de",
      format: "json",
    });

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    );

    if (!res.ok) return null;

    const data = await res.json();
    const first = data?.results?.[0];

    if (
      !first ||
      typeof first.latitude !== "number" ||
      typeof first.longitude !== "number"
    ) {
      return null;
    }

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      resolvedName: String(first.name),
    };
  } catch {
    return null;
  }
}
