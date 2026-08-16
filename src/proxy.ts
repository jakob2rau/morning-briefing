import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16: "middleware.ts" wurde durch "proxy.ts" ersetzt (gleiche
// Funktionsweise, nur umbenannt - siehe node_modules/next/dist/docs/…/
// proxy.md). Sperrt die komplette App hinter der Google-Anmeldung: ohne
// gültige Session gibt es für Seiten nur eine Weiterleitung zu /signin
// und für API-Routen nur ein 401 JSON - nie Inhalte oder Daten.
//
// Wer sich anmelden darf, wird zusätzlich per E-Mail-Allowlist in
// auth.ts (callbacks.signIn) auf den eigenen Google-Account eingeschränkt
// - hier wird nur geprüft, ob überhaupt eine (damit bereits geprüfte)
// Session vorliegt.
//
// Ausnahmen vom Login-Zwang (siehe config.matcher unten):
// - /api/auth/*            NextAuth's eigene Routen - ohne die wäre gar
//                           kein Login-Flow (OAuth-Redirect, Callback)
//                           möglich.
// - /api/morning-briefing  bleibt für den täglichen Vercel-Cron-Job
//                           erreichbar, der keine Browser-Session hat.
//                           Schützt sich stattdessen selbst: der Cron-Pfad
//                           über CRON_SECRET, der "normale" Lesepfad über
//                           eine eigene auth()-Prüfung (siehe dortige
//                           route.ts) - bleibt also trotzdem
//                           zugriffsgeschützt, nur eben nicht hier.
// - /signin                 die Login-Seite selbst (sonst Redirect-Loop).
// - statische Assets/Icons/Manifest/Service-Worker - keine Nutzerdaten,
//   müssen auch auf dem Login-Screen ladbar sein (PWA-Metadaten,
//   Favicon, Service-Worker-Registrierung).
export default auth((req) => {
  if (req.auth) return;

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    "/((?!api/auth|api/morning-briefing|signin|_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|icon-512.png|apple-touch-icon.png|sw.js).*)",
  ],
};
