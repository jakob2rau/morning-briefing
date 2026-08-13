import { XMLParser } from "fast-xml-parser";
import { NEWS_CATEGORY_ORDER, type NewsCategoryId } from "@/lib/categories";

export type Headline = {
  title: string;
  link: string;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as { "#text": unknown })["#text"]);
  }
  return "";
}

export async function getHeadlines(
  feedUrl: string,
  limit = 3,
): Promise<Headline[]> {
  try {
    const res = await fetch(feedUrl, {
      next: { revalidate: 600 }, // 10 Minuten cachen
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MorningBriefing/1.0)",
      },
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const data = parser.parse(xml);
    const items = asArray(data?.rss?.channel?.item);

    return items.slice(0, limit).map((item) => ({
      title: textOf(item?.title).trim(),
      link: textOf(item?.link).trim(),
    })).filter((headline) => headline.title && headline.link);
  } catch {
    return [];
  }
}

/**
 * Ruft für jede der vier News-Kategorien alle in den Einstellungen
 * konfigurierten Feed-URLs parallel ab und führt ihre Schlagzeilen
 * zusammen. Ein Feed, der fehlschlägt (falsche URL, Netzwerkfehler, kein
 * valides RSS), liefert einfach keine Schlagzeilen bei - siehe
 * `getHeadlines`s eigenes Try-Catch.
 */
export async function getAllNews(
  feedsByCategory: Record<NewsCategoryId, string[]>,
  limit = 3,
): Promise<Array<{ id: NewsCategoryId; headlines: Headline[] }>> {
  return Promise.all(
    NEWS_CATEGORY_ORDER.map(async (id) => {
      const urls = feedsByCategory[id] ?? [];
      const perFeed = await Promise.all(
        urls.map((url) => getHeadlines(url, limit)),
      );
      return { id, headlines: perFeed.flat() };
    }),
  );
}
