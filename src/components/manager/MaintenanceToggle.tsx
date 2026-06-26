"use client";

import { useEffect, useState } from "react";

// מתג "האתר בבנייה" למסך המנהל — מציג מצב ומאפשר הדלקה/כיבוי לציבור.
export function MaintenanceToggle({ he }: { he: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/manager/maintenance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOn(d.on === true))
      .catch(() => {});
  }, []);

  const toggle = async () => {
    if (on === null || busy) return;
    const next = !on;
    setBusy(true);
    try {
      const r = await fetch("/api/manager/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      if (r.ok) setOn(next);
    } finally {
      setBusy(false);
    }
  };

  if (on === null) {
    return <span className="text-xs text-white/60">…</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold">
        {he ? "האתר לציבור:" : "Public site:"}{" "}
        <span className={on ? "text-amber-300" : "text-green-300"}>
          {on ? (he ? "בבנייה 🚧" : "Under construction 🚧") : he ? "פתוח ✅" : "Open ✅"}
        </span>
      </span>
      <button
        onClick={toggle}
        disabled={busy}
        className="text-xs font-bold border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10 disabled:opacity-60"
      >
        {busy
          ? "…"
          : on
            ? he
              ? "פתח לציבור"
              : "Open to public"
            : he
              ? "העבר לבנייה"
              : "Set construction"}
      </button>
    </div>
  );
}
