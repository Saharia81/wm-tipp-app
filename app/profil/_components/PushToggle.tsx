"use client";

import { useEffect, useState } from "react";
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "../actions";

// VAPID-Public-Key (Base64-URL) → Uint8Array, wie es pushManager.subscribe erwartet.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Über einen expliziten ArrayBuffer, damit der Typ Uint8Array<ArrayBuffer> ist
  // (applicationServerKey akzeptiert keinen SharedArrayBuffer-Backing).
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim Laden: Service Worker registrieren und prüfen, ob dieses Gerät schon
  // ein aktives Abo hat.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus(existing ? "on" : "off");
        }
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        setError("Push ist serverseitig nicht konfiguriert.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });

      const res = await savePushSubscriptionAction(sub.toJSON());
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus("on");
    } catch {
      setError("Aktivieren fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Deaktivieren fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
        Tipp-Erinnerung
      </p>
      <p className="text-sm text-white/80">
        Erhalte am Nachmittag eine Push-Benachrichtigung, wenn du Spiele des Tages
        noch nicht getippt hast.
      </p>

      {status === "loading" && (
        <p className="text-sm text-white/50">Wird geladen…</p>
      )}

      {status === "unsupported" && (
        <p className="text-sm text-white/60 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          Push wird hier nicht unterstützt. Auf dem iPhone musst du die App zuerst
          über „Teilen → Zum Home-Bildschirm“ installieren und sie von dort öffnen.
        </p>
      )}

      {status === "denied" && (
        <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
          Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den
          Browser-Einstellungen und lade die Seite neu.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {status === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="h-12 rounded-full bg-emerald-400 text-[#0a1f44] font-semibold disabled:opacity-60"
        >
          {busy ? "Aktivieren…" : "Erinnerungen aktivieren"}
        </button>
      )}

      {status === "on" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
            Erinnerungen sind auf diesem Gerät aktiv.
          </p>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="h-12 rounded-full bg-white/10 border border-white/15 text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Deaktivieren…" : "Erinnerungen deaktivieren"}
          </button>
        </div>
      )}
    </section>
  );
}
