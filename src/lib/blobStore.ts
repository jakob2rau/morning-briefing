import { get, put } from "@vercel/blob";

/**
 * Kleine JSON-Persistenz auf Basis von Vercel Blob. Vercel-Serverless-Functions
 * haben nur ein schreibgeschütztes Dateisystem (außer /tmp, das nicht
 * dauerhaft und nicht zwischen Aufrufen geteilt ist) - normales fs.writeFile
 * schlägt dort fehl. Vercel Blob ist der dauerhafte, beschreibbare Ersatz
 * dafür. Jeder Pfad wird "in place" überschrieben (kein Verlauf), passend
 * zum bisherigen Ein-Datei-pro-Zustand-Modell.
 */

export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  try {
    // useCache: false - @vercel/blob's get() serviert sonst standardmäßig
    // aus dem CDN-Cache und kann kurz nach einem writeJsonBlob() (z. B.
    // gerade gespeicherte Einstellungen) noch einen veralteten Stand
    // zurückgeben. Für diese Ein-Nutzer-App mit geringem Traffic ist die
    // Garantie auf den aktuellen Stand wichtiger als die etwas schnellere
    // CDN-Antwort.
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Fehler beim Lesen von Blob "${pathname}"`, error);
    return null;
  }
}

export async function writeJsonBlob(
  pathname: string,
  data: unknown,
): Promise<void> {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
