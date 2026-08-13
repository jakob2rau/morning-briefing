"use client";

import { useEffect, useState, type ReactNode } from "react";

type Status =
  | "checking"
  | "unsupported"
  | "unsubscribed"
  | "subscribed"
  | "denied"
  | "busy"
  | "error";

type SupportChecks = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  notificationPermission: NotificationPermission | "unbekannt";
};

function collectSupportChecks(): SupportChecks {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";
  const hasNotificationApi = hasWindow && "Notification" in window;

  return {
    hasServiceWorker: hasNavigator && "serviceWorker" in navigator,
    hasPushManager: hasWindow && "PushManager" in window,
    hasNotification: hasNotificationApi,
    notificationPermission: hasNotificationApi
      ? Notification.permission
      : "unbekannt",
  };
}

function isPushSupported(checks: SupportChecks): boolean {
  return (
    checks.hasServiceWorker && checks.hasPushManager && checks.hasNotification
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const support = collectSupportChecks();

      if (!isPushSupported(support)) {
        setStatus("unsupported");
        return;
      }

      if (support.notificationPermission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "subscribed" : "unsubscribed");
      } catch (error) {
        // Wichtig: hier NICHT "unsupported" setzen - die Checks oben zeigen
        // ja, dass die APIs vorhanden sind. Ein Fehler an dieser Stelle ist
        // ein Registrierungsproblem, kein Support-Problem.
        console.error("Fehler bei der Service-Worker-Registrierung", error);
        if (!cancelled) {
          setLastError(errorToMessage(error));
          setStatus("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setLastError("NEXT_PUBLIC_VAPID_PUBLIC_KEY ist nicht gesetzt.");
      setStatus("error");
      return;
    }

    setStatus("busy");
    setLastError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      // register() statt .ready verwenden: .ready hängt sich auf, wenn die
      // Registrierung aus irgendeinem Grund nie aktiv wird.
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      setStatus("subscribed");
    } catch (error) {
      console.error("Fehler beim Aktivieren der Benachrichtigungen", error);
      setLastError(errorToMessage(error));
      setStatus("error");
    }
  }

  async function handleUnsubscribe() {
    setStatus("busy");
    setLastError(null);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setStatus("unsubscribed");
    } catch (error) {
      console.error("Fehler beim Deaktivieren der Benachrichtigungen", error);
      setLastError(errorToMessage(error));
      setStatus("subscribed");
    }
  }

  if (status === "checking") return null;

  let body: ReactNode;

  if (status === "unsupported") {
    body = (
      <p className="text-xs text-zinc-500">
        Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        Auf dem iPhone: Seite zuerst über &quot;Zum Home-Bildschirm&quot;
        hinzufügen und von dort öffnen.
      </p>
    );
  } else if (status === "denied") {
    body = (
      <p className="text-xs text-zinc-500">
        Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in
        den Browser-/System-Einstellungen, um sie hier zu aktivieren.
      </p>
    );
  } else if (status === "error") {
    body = (
      <div className="space-y-2">
        <p className="text-xs text-red-600">
          Beim Aktivieren ist ein Fehler aufgetreten
          {lastError ? `: ${lastError}` : "."}
        </p>
        <button
          type="button"
          onClick={handleSubscribe}
          className="flex h-10 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  } else if (status === "subscribed") {
    body = (
      <button
        type="button"
        onClick={handleUnsubscribe}
        className="text-xs text-zinc-500 hover:underline"
      >
        Benachrichtigungen aktiviert ✓ – deaktivieren
      </button>
    );
  } else {
    body = (
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={status === "busy"}
        className="flex h-10 w-full items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {status === "busy" ? "Wird aktiviert…" : "Benachrichtigungen erlauben"}
      </button>
    );
  }

  return <div>{body}</div>;
}
