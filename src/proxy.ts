import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";
import type { NextAuthRequest } from "next-auth";
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
// `auth(callback)` ist überladen (Middleware- vs. Route-Handler-Signatur)
// und TypeScript wählt bei einem einparametrigen Callback nicht
// zuverlässig die Middleware-Overload - daher hier explizit auf
// `NextMiddleware` casten, statt uns auf die Inferenz zu verlassen.
const authProxy = auth((req: NextAuthRequest) => {
  if (req.auth) return;

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
}) as unknown as NextMiddleware;

/**
 * auth() selbst entschlüsselt dafür bei JEDER Anfrage das Session-Cookie -
 * schlägt das fehl (z. B. ein zu großes, abgeschnittenes oder anderweitig
 * kaputtes Cookie), wirft next-auth intern eine Exception, BEVOR unsere
 * eigene Logik oben überhaupt läuft. Ohne dieses äußere try/catch würde
 * das JEDE Anfrage der App zum Absturz bringen (kein HTTP-Response mehr -
 * "This page couldn't load" in jedem Browser) und zwar dauerhaft, weil
 * der Browser das kaputte Cookie automatisch bei jeder weiteren Anfrage
 * wieder mitschickt, auch nach Neustart/"frischem" Tab. Bei einem Fehler
 * stattdessen sauber zu /signin umleiten UND alle authjs-Cookies löschen,
 * damit sich der Fehler nicht endlos wiederholt.
 */
export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  try {
    return await authProxy(req, event);
  } catch (error) {
    console.error("proxy: Fehler bei der Session-Prüfung", error);

    const { pathname } = req.nextUrl;
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : (() => {
          const signInUrl = new URL("/signin", req.nextUrl.origin);
          signInUrl.searchParams.set("callbackUrl", pathname);
          return NextResponse.redirect(signInUrl);
        })();

    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes("authjs.")) {
        // Explizit path: "/" - ohne exakt passenden Pfad wird ein
        // "__Host-"/"__Secure-"-präfixiertes Cookie vom Browser sonst
        // nicht wirklich gelöscht (Set-Cookie muss Pfad/Domain des
        // Original-Cookies treffen).
        response.cookies.delete({ name: cookie.name, path: "/" });
      }
    }

    return response;
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|api/morning-briefing|signin|_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|icon-512.png|apple-touch-icon(?:-precomposed)?.png|sw.js).*)",
  ],
};
