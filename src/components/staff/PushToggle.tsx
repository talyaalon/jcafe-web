"use client";

import { useEffect, useState } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "idle" | "on" | "working" | "denied" | "unsupported";

// כפתור הפעלת התראות רקע (Web Push) למסך המלקט.
export function PushToggle({ company, he }: { company: number; he: boolean }) {
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) setState("on");
    });
  }, []);

  const enable = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "idle");
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID as string) as unknown as BufferSource,
        });
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), company }),
      });
      setState("on");
    } catch {
      setState("idle");
    }
  };

  if (state === "unsupported") return null;
  if (state === "on") {
    return (
      <span className="text-xs font-bold text-white/90 inline-flex items-center gap-1">
        🔔 {he ? "התראות פעילות" : "Alerts on"}
      </span>
    );
  }
  if (state === "denied") {
    return (
      <span className="text-[11px] text-white/70">
        {he ? "התראות חסומות בדפדפן" : "Alerts blocked"}
      </span>
    );
  }
  return (
    <button
      onClick={enable}
      disabled={state === "working"}
      className="text-xs font-bold border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10 disabled:opacity-60"
    >
      {state === "working" ? "…" : he ? "🔔 הפעל התראות" : "🔔 Enable alerts"}
    </button>
  );
}
