import { XMLParser } from "fast-xml-parser";

export type Headline = {
  title: string;
  link: string;
};

export type NewsSource = {
  id: string;
  label: string;
  feedUrl: string;
};

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "tech",
    label: "Technik & Startups",
    feedUrl: "https://techcrunch.com/feed/",
  },
  {
    id: "wirtschaft",
    label: "Wirtschaft",
    feedUrl: "https://www.tagesschau.de/wirtschaft/konjunktur/index~rss2.xml",
  },
  {
    id: "politik",
    label: "Politik",
    feedUrl: "https://www.tagesschau.de/inland/innenpolitik/index~rss2.xml",
  },
  {
    id: "sport",
    label: "Sport",
    feedUrl: "https://www.sportschau.de/index~rss2.xml",
  },
];

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

export async function getAllNews() {
  const results = await Promise.all(
    NEWS_SOURCES.map(async (source) => ({
      ...source,
      headlines: await getHeadlines(source.feedUrl),
    })),
  );
  return results;
}
