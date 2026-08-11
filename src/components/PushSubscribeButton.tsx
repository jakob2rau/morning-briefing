"use client";

import { useEffect, useState, type ReactNode } from "react";

type Status =
  | "checking"
  | "unsupported"
  | "unsubscribed"
  | "subscribed"
  | "denied"
  | "busy";

type SupportChecks = {
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isStandalone: boolean;
  notificationPermission: NotificationPermission | "unbekannt";
  userAgent: string;
};

function collectSupportChecks(): SupportChecks {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";
  const hasNotificationApi = hasWindow && "Notification" in window;

  // navigator.standalone ist eine nicht-standardisierte Safari/iOS-Eigenschaft,
  // die es in den offiziellen DOM-Typen nicht gibt.
  const iosStandalone = hasNavigator
    ? (navigator as unknown as { standalone?: boolean }).standalone === true
    : false;
  const displayModeStandalone =
    hasWindow && typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;

  return {
    isSecureContext: hasWindow ? window.isSecureContext : false,
    hasServiceWorker: hasNavigator && "serviceWorker" in navigator,
    hasPushManager: hasWindow && "PushManager" in window,
    hasNotification: hasNotificationApi,
    isStandalone: iosStandalone || displayModeStandalone,
    notificationPermission: hasNotificationApi
      ? Notification.permission
      : "unbekannt",
    userAgent: hasNavigator ? navigator.userAgent : "",
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function DebugPanel({ checks }: { checks: SupportChecks }) {
  const rows: Array<[string, boolean | string]> = [
    ["Sicherer Kontext (HTTPS)", checks.isSecureContext],
    ["Service Worker unterstützt", checks.hasServiceWorker],
    ["PushManager unterstützt", checks.hasPushManager],
    ["Notification API unterstützt", checks.hasNotification],
    ["Standalone-Modus erkannt", checks.isStandalone],
    ["Benachrichtigungs-Berechtigung", checks.notificationPermission],
  ];

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-2 font-medium text-zinc-500 dark:text-zinc-400">
        Debug: Push-Voraussetzungen
      </p>
      <ul className="space-y-1">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center justify-between gap-3">
            <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
            <span
              className={
                typeof value === "boolean"
                  ? value
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                  : "text-zinc-600 dark:text-zinc-300"
              }
            >
              {typeof value === "boolean" ? (value ? "✅ ja" : "❌ nein") : value}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 break-all text-[10px] text-zinc-400 dark:text-zinc-500">
        {checks.userAgent}
      </p>
    </div>
  );
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [checks, setChecks] = useState<SupportChecks | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const support = collectSupportChecks();
      if (!cancelled) setChecks(support);

      if (
        !support.hasServiceWorker ||
        !support.hasPushManager ||
        !support.hasNotification
      ) {
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
        console.error("Fehler bei der Service-Worker-Registrierung", error);
        if (!cancelled) setStatus("unsupported");
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
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY ist nicht gesetzt.");
      setStatus("unsupported");
      return;
    }

    setStatus("busy");

    try {
      const permission = await Notification.requestPermission();
      setChecks((prev) =>
        prev ? { ...prev, notificationPermission: permission } : prev,
      );
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
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
      setStatus("unsubscribed");
    }
  }

  async function handleUnsubscribe() {
    setStatus("busy");

    try {
      const registration = await navigator.serviceWorker.ready;
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
      setStatus("subscribed");
    }
  }

  if (status === "checking") return null;

  let body: ReactNode;

  if (status === "unsupported") {
    body = (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        Auf dem iPhone: Seite zuerst über &quot;Zum Home-Bildschirm&quot;
        hinzufügen und von dort öffnen.
      </p>
    );
  } else if (status === "denied") {
    body = (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in
        den Browser-/System-Einstellungen, um sie hier zu aktivieren.
      </p>
    );
  } else if (status === "subscribed") {
    body = (
      <button
        type="button"
        onClick={handleUnsubscribe}
        className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
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
        className="flex h-10 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {status === "busy" ? "Wird aktiviert…" : "Benachrichtigungen erlauben"}
      </button>
    );
  }

  return (
    <div>
      {body}
      {checks && <DebugPanel checks={checks} />}
    </div>
  );
}
