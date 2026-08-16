// Kurzer, warmer Chime für den Streak-Moment ("Fertig für heute") - bewusst
// per Web Audio API aus ein paar Sinuston-Oszillatoren synthetisiert statt
// als eingebundene Audiodatei, damit keine Lizenzfragen entstehen und kein
// zusätzlicher Asset geladen werden muss.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

// Warmer Dur-Akkord (Grundton, große Terz, Quinte, Oktave) - je höher der
// Ton, desto leiser und kürzer, damit der Gesamteindruck weich statt
// glockenhart/schrill bleibt. Gesamtdauer ca. 0.9s, passend zur
// Sonnenaufgangs-Animation (ANIMATION_MS in StreakSlideContent.tsx).
const NOTES: Array<{
  frequency: number;
  gain: number;
  delay: number;
  duration: number;
}> = [
  { frequency: 523.25, gain: 0.22, delay: 0, duration: 0.9 }, // C5
  { frequency: 659.25, gain: 0.16, delay: 0.04, duration: 0.8 }, // E5
  { frequency: 783.99, gain: 0.12, delay: 0.08, duration: 0.7 }, // G5
  { frequency: 1046.5, gain: 0.07, delay: 0.1, duration: 0.6 }, // C6
];

/**
 * Spielt den Streak-Chime ab. Muss aus einem echten Nutzer-Interaktions-
 * Handler (Klick) heraus aufgerufen werden, da Browser einen frisch
 * erzeugten AudioContext sonst im Zustand "suspended" belassen. Bricht
 * still ab, falls Web Audio nicht verfügbar ist (SSR, sehr alte Browser).
 */
export function playStreakChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") void ctx.resume();

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const now = ctx.currentTime;

  for (const note of NOTES) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = note.frequency;

    const gain = ctx.createGain();
    const start = now + note.delay;
    const end = start + note.duration;

    // Sanfter Attack statt Klick, danach exponentieller Ausklang -
    // typisches weiches Glocken-/Chime-Hüllkurven-Profil.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(note.gain, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(end + 0.05);
  }
}
