"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";

export interface FloorOrder {
  id: string;
  order_name: string | null;
  customer: string | null;
  method: string | null;
  created_at: string;
  total: number;
  done: number;
  stores: string[];
  scheduled: string | null;
}

type Stage = "new" | "picking" | "ready";
const stageOf = (o: FloorOrder): Stage =>
  o.done === 0 ? "new" : o.done >= o.total ? "ready" : "picking";

export function PosFloor({ locale, orders }: { locale: Locale; orders: FloorOrder[] }) {
  const he = locale === "he";
  const [tab, setTab] = useState<"all" | Stage>("all");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const tabs: { key: "all" | Stage; label: string }[] = [
    { key: "all", label: he ? "הכל" : "All" },
    { key: "new", label: he ? "חדשים" : "New" },
    { key: "picking", label: he ? "בליקוט" : "Picking" },
    { key: "ready", label: he ? "מוכן לאיסוף" : "Ready" },
  ];

  const shown = orders.filter((o) => tab === "all" || stageOf(o) === tab);

  const elapsed = (iso: string, stage: Stage) => {
    if (stage === "ready") return he ? "מוכן ✓" : "Ready ✓";
    const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
    if (mins < 1) return he ? "עכשיו" : "now";
    return he ? `${mins} דק׳` : `${mins}m`;
  };

  const tone = (stage: Stage) =>
    stage === "ready"
      ? "border-t-4 border-t-brand-green shadow-[0_0_0_2px_rgba(31,157,85,.15)]"
      : stage === "picking"
        ? "border-t-4 border-t-amber-400"
        : "border-t-4 border-t-ink/20";

  return (
    <div>
      {/* filter tabs */}
      <div className="flex gap-2 px-4 sm:px-6 py-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-bold rounded-full px-4 py-1.5 border transition ${
              tab === t.key ? "bg-wine text-white border-wine" : "border-line text-ink/70 hover:border-wine"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="p-8 text-center text-ink/50">{he ? "אין הזמנות" : "No orders"}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-6 pb-6">
          {shown.map((o) => {
            const stage = stageOf(o);
            return (
              <Link
                key={o.id}
                href={`/${locale}/picker/${o.id}`}
                className={`block rounded-xl bg-white border border-line p-4 hover:shadow-md transition ${tone(stage)}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-wine">{o.order_name || "—"}</span>
                  {stage === "new" && (
                    <span className="text-[10px] font-bold bg-gold-soft/70 text-wine rounded-full px-2 py-0.5">
                      {he ? "חדש" : "New"}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-ink mt-0.5">{o.customer || "—"}</div>
                <div className="text-[12px] text-ink/55 mt-0.5 line-clamp-1">
                  {o.stores.join(" · ")}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span
                    className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                      o.method === "delivery" ? "bg-wine/10 text-wine" : "bg-soft text-ink/70"
                    }`}
                  >
                    {o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
                  </span>
                  <span
                    className={`text-sm font-extrabold ${stage === "ready" ? "text-brand-green" : "text-amber-600"}`}
                  >
                    {o.done}/{o.total}
                  </span>
                </div>
                <div className="text-[11px] text-ink/45 mt-1">{elapsed(o.created_at, stage)}</div>
                {o.scheduled && (
                  <div className="text-[10px] text-amber-700 mt-1">🗓 {o.scheduled}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
