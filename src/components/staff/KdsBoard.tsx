"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { setItemStatus } from "@/lib/staff/actions";

export interface KdsDish {
  index: number;
  name: string;
  qty: number;
  status: string;
}
export interface KdsOrder {
  id: string;
  order_name: string | null;
  customer: string | null;
  created_at: string;
  notes: string | null;
  dishes: KdsDish[];
}

const TARGET_MIN = 15; // זמן יעד להכנה (חריגה → אדום)

export function KdsBoard({ locale, orders }: { locale: Locale; orders: KdsOrder[] }) {
  const he = locale === "he";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (orders.length === 0) {
    return <p className="p-8 text-center text-ink/50">{he ? "אין מנות בתור" : "No dishes in queue"}</p>;
  }

  const timer = (iso: string) => {
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  const overMin = (iso: string) => (now - new Date(iso).getTime()) / 60000 > TARGET_MIN;

  // הכנה (לא-מוכן) קודם, מוכנים בסוף
  const sorted = [...orders].sort((a, b) => {
    const ad = a.dishes.every((d) => d.status === "done") ? 1 : 0;
    const bd = b.dishes.every((d) => d.status === "done") ? 1 : 0;
    return ad - bd;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
      {sorted.map((o) => {
        const allDone = o.dishes.every((d) => d.status === "done");
        const over = overMin(o.created_at) && !allDone;
        const tone = allDone
          ? "border-brand-green"
          : over
            ? "border-red-500"
            : "border-amber-400";
        return (
          <div key={o.id} className={`rounded-xl bg-white border-2 ${tone} overflow-hidden`}>
            <div
              className={`flex justify-between items-center px-4 py-2 text-sm font-bold ${
                allDone ? "bg-green-50 text-brand-green" : over ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
              }`}
            >
              <span>
                {o.order_name} · {o.customer}
              </span>
              <span>{allDone ? (he ? "מוכן ✓" : "Ready ✓") : `⏱ ${timer(o.created_at)}`}</span>
            </div>

            <ul className="divide-y divide-line/60">
              {o.dishes.map((d) => (
                <li key={d.index} className="px-4 py-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-ink text-sm">
                      {d.name} <span className="text-ink/45">×{d.qty}</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold flex-none ${
                        d.status === "done"
                          ? "text-brand-green"
                          : d.status === "unavailable"
                            ? "text-red-500"
                            : "text-amber-600"
                      }`}
                    >
                      {d.status === "done"
                        ? he
                          ? "מוכן ✓"
                          : "Ready ✓"
                        : d.status === "unavailable"
                          ? he
                            ? "לא זמין"
                            : "Unavailable"
                          : he
                            ? "בהכנה"
                            : "Preparing"}
                    </span>
                  </div>
                  {d.status !== "done" && d.status !== "unavailable" && (
                    <div className="flex gap-2 mt-2">
                      <form action={setItemStatus} className="flex-1">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="index" value={d.index} />
                        <input type="hidden" name="status" value="done" />
                        <button className="w-full bg-brand-green text-white font-bold rounded-lg py-1.5 text-xs">
                          {he ? "מוכן ✓" : "Ready ✓"}
                        </button>
                      </form>
                      <form action={setItemStatus} className="flex-1">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="index" value={d.index} />
                        <input type="hidden" name="status" value="unavailable" />
                        <button className="w-full border border-red-300 text-red-600 font-bold rounded-lg py-1.5 text-xs">
                          {he ? "לא זמין" : "Unavailable"}
                        </button>
                      </form>
                    </div>
                  )}
                  {d.status === "done" && (
                    <form action={setItemStatus} className="mt-2">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="index" value={d.index} />
                      <input type="hidden" name="status" value="pending" />
                      <button className="text-[11px] text-ink/50 underline">
                        {he ? 'בטל "מוכן"' : "Undo ready"}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>

            {o.notes && (
              <div className="px-4 py-2 bg-amber-50 text-amber-800 text-[11px] border-t border-amber-200">
                ⚠ {o.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
