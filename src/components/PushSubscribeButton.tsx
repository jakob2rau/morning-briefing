"use client";

import { useEffect, useState } from "react";

type Status =
  | "checking"
  | "unsupported"
  | "unsubscribed"
  | "subscribed"
  | "denied"
  | "busy";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "subscribed" : "unsubscribed");
      } catch {
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

  if (status === "unsupported") {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        Auf dem iPhone: Seite zuerst über &quot;Zum Home-Bildschirm&quot;
        hinzufügen und von dort öffnen.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in
        den Browser-/System-Einstellungen, um sie hier zu aktivieren.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        type="button"
        onClick={handleUnsubscribe}
        className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
      >
        Benachrichtigungen aktiviert ✓ – deaktivieren
      </button>
    );
  }

  return (
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
