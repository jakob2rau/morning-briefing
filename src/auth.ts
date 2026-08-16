import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshAccessToken(token: {
  refreshToken?: string;
  [key: string]: unknown;
}) {
  try {
    if (!token.refreshToken) throw new Error("Kein Refresh-Token vorhanden");

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      // Läuft bei JEDER Anfrage einer gesperrten Seite/Route innerhalb von
      // proxy.ts, sobald das Access-Token abgelaufen ist (siehe jwt()
      // oben). Ohne Timeout hängt ein langsames/nicht antwortendes
      // Google-Token-Endpoint sonst die komplette App auf, bis proxy.ts'
      // eigene Zeitgrenze greift - kein HTTP-Response mehr, "This page
      // couldn't load" bei praktisch jeder Anfrage.
      signal: AbortSignal.timeout(6000),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error("Fehler beim Erneuern des Google-Access-Tokens", error);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    // Eigene, zum Design passende Login-Seite statt NextAuth's generischer
    // Standardseite - proxy.ts leitet nicht angemeldete Besucher genau
    // hierher um.
    signIn: "/signin",
    // Ohne diese Zeile landet man bei einem OAuth-Fehler (z. B. wenn
    // Google beim Zurückkommen einen Callback-Parameter nicht liefert)
    // auf NextAuth's eigener, unbekannter /api/auth/error-Seite statt auf
    // unserer eigenen - /signin zeigt den Fehler stattdessen selbst an
    // (siehe ?error= in signin/page.tsx) und bietet direkt den
    // "Erneut versuchen"-Button.
    error: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Diese App ist für genau einen Google-Account gedacht - jede andere
    // E-Mail wird beim Login abgelehnt (kein Account wird angelegt, keine
    // Session entsteht), egal wie gültig das Google-Konto sonst ist.
    // ALLOWED_GOOGLE_EMAIL fehlt absichtlich kein Fallback: ohne gesetzte
    // Env-Var schlägt JEDER Login fehl (fail closed statt offen).
    async signIn({ profile }) {
      const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL?.trim().toLowerCase();
      if (!allowedEmail) {
        console.error("ALLOWED_GOOGLE_EMAIL ist nicht gesetzt - Login wird verweigert.");
        return false;
      }
      return profile?.email?.toLowerCase() === allowedEmail;
    },
    async jwt({ token, account }) {
      // Erstanmeldung: Tokens aus dem Google-Account übernehmen
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now(),
          refreshToken: account.refresh_token,
        };
      }

      // Access-Token noch gültig
      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
      ) {
        return token;
      }

      // Access-Token abgelaufen -> erneuern
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
