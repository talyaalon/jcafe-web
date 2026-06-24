"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  release_at?: string | null;
}

type Stage = "new" | "picking" | "ready";
type Tab = "all" | Stage | "future";
const stageOf = (o: FloorOrder): Stage =>
  o.done === 0 ? "new" : o.done >= o.total ? "ready" : "picking";

export function PosFloor({
  locale,
  orders,
  future = [],
}: {
  locale: Locale;
  orders: FloorOrder[];
  future?: FloorOrder[];
}) {
  const he = locale === "he";
  const [tab, setTab] = useState<Tab>("all");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // ===== התרעת הזמנה חדשה: צפצוף + חלון מתמשך עד שלוחצים X =====
  // הרענון של AutoRefresh הוא רך (router.refresh) ושומר את ה-state כאן, לכן אפשר
  // לזכור אילו הזמנות כבר נראו ולזהות חדשות שנכנסו בין רענון לרענון.
  const [pendingNew, setPendingNew] = useState<FloorOrder[]>([]);
  const seenRef = useRef<Set<string> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const AC =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioRef.current = new AC();
    }
    return audioRef.current;
  }, []);

  const beep = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    // צמד צלילים קצר ובולט
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.17);
    });
  }, [getCtx]);

  // "שחרור" האודיו בלחיצה/הקלדה ראשונה: יוצרים ומפעילים את ה-AudioContext בתוך
  // מחווה אמיתית, כדי שהצפצוף יישמע אחר כך גם כשהוא מופעל אוטומטית.
  useEffect(() => {
    const unlock = () => {
      const ctx = getCtx();
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [getCtx]);

  // זיהוי הזמנות חדשות בכל עדכון של רשימת ההזמנות הפעילות
  useEffect(() => {
    const ids = orders.map((o) => o.id);
    if (seenRef.current === null) {
      // טעינה ראשונה — לא מתריעים על הזמנות קיימות
      seenRef.current = new Set(ids);
      return;
    }
    const fresh = orders.filter((o) => !seenRef.current!.has(o.id));
    if (!fresh.length) return;
    fresh.forEach((o) => seenRef.current!.add(o.id));
    setPendingNew((prev) => {
      const existing = new Set(prev.map((p) => p.id));
      const add = fresh.filter((o) => !existing.has(o.id));
      return add.length ? [...prev, ...add] : prev;
    });
  }, [orders]);

  // צפצוף כשנכנסות חדשות, וחזרה כל 7 שניות עד שמאשרים
  useEffect(() => {
    if (!pendingNew.length) return;
    beep();
    const id = setInterval(beep, 7000);
    return () => clearInterval(id);
  }, [pendingNew.length, beep]);

  const dismissAlert = () => setPendingNew([]);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "all", label: he ? "הכל" : "All" },
    { key: "new", label: he ? "חדשים" : "New" },
    { key: "picking", label: he ? "בליקוט" : "Picking" },
    { key: "ready", label: he ? "מוכן לאיסוף" : "Ready" },
    { key: "future", label: he ? "עתידיות" : "Scheduled", badge: future.length },
  ];

  const isFuture = tab === "future";
  const shown = isFuture
    ? future
    : orders.filter((o) => tab === "all" || stageOf(o) === tab);

  // עיצוב מועד השחרור (תאילנד) + ספירה לאחור עד הכניסה למטבח
  const bkk = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(iso).toLocaleString(he ? "he-IL" : "en-GB", { timeZone: "Asia/Bangkok", ...opts });
  const untilRelease = (iso: string) => {
    const mins = Math.round((new Date(iso).getTime() - now) / 60000);
    if (mins <= 0) return he ? "נכנס למטבח עכשיו" : "entering kitchen now";
    if (mins < 60) return he ? `נכנס למטבח בעוד ${mins} דק׳` : `to kitchen in ${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return he ? `נכנס למטבח בעוד ${h}ש׳ ${m}ד׳` : `to kitchen in ${h}h ${m}m`;
  };

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
      {/* התרעת הזמנה חדשה — מודאל מתמשך שנסגר רק ב-X */}
      {pendingNew.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-t-8 border-t-wine overflow-hidden">
            <div className="flex items-center justify-between gap-3 bg-wine text-white px-5 py-3">
              <span className="font-extrabold text-lg flex items-center gap-2">
                🔔 {he ? "הזמנה חדשה!" : "New order!"}
                {pendingNew.length > 1 && (
                  <span className="text-sm font-bold bg-white/25 rounded-full px-2 py-0.5">
                    {pendingNew.length}
                  </span>
                )}
              </span>
              <button
                onClick={dismissAlert}
                aria-label={he ? "סגירה" : "Close"}
                className="text-white/90 hover:text-white text-2xl leading-none font-bold px-2"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-line">
              {pendingNew.map((o) => (
                <Link
                  key={o.id}
                  href={`/${locale}/picker/${o.id}`}
                  onClick={dismissAlert}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-soft"
                >
                  <span>
                    <span className="font-extrabold text-wine">{o.order_name || "—"}</span>
                    <span className="block text-sm text-ink/70">{o.customer || "—"}</span>
                    {o.stores.length > 0 && (
                      <span className="block text-[12px] text-ink/45 line-clamp-1">
                        {o.stores.join(" · ")}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0 ${
                      o.method === "delivery" ? "bg-wine/10 text-wine" : "bg-soft text-ink/70"
                    }`}
                  >
                    {o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
                  </span>
                </Link>
              ))}
            </div>
            <div className="p-4">
              <button
                onClick={dismissAlert}
                className="w-full bg-wine text-white font-bold rounded-xl py-3 hover:bg-wine-hover"
              >
                {he ? "הבנתי, סגור" : "Got it, dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* filter tabs */}
      <div className="flex gap-2 px-4 sm:px-6 py-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm font-bold rounded-full px-4 py-1.5 border transition flex items-center gap-1.5 ${
              tab === t.key ? "bg-wine text-white border-wine" : "border-line text-ink/70 hover:border-wine"
            }`}
          >
            {t.key === "future" && "🗓"}
            {t.label}
            {!!t.badge && (
              <span
                className={`text-[11px] font-extrabold rounded-full px-1.5 ${
                  tab === t.key ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="p-8 text-center text-ink/50">
          {isFuture
            ? he
              ? "אין הזמנות עתידיות. הזמנות מתוזמנות יופיעו כאן עד שעה לפני מועדן."
              : "No scheduled orders. Future orders appear here until an hour before their time."
            : he
              ? "אין הזמנות"
              : "No orders"}
        </p>
      ) : isFuture ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-6 pb-6">
          {shown.map((o) => (
            <div
              key={o.id}
              className="block rounded-xl bg-white border border-line border-t-4 border-t-amber-300 p-4"
            >
              <div className="flex justify-between items-start">
                <span className="font-extrabold text-wine">{o.order_name || "—"}</span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  {he ? "עתידית" : "Scheduled"}
                </span>
              </div>
              <div className="text-sm font-bold text-ink mt-0.5">{o.customer || "—"}</div>
              <div className="text-[12px] text-ink/55 mt-0.5 line-clamp-1">{o.stores.join(" · ")}</div>
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-2">
                <div className="text-[12px] font-bold text-amber-800">
                  🗓 {o.scheduled
                    ? bkk(new Date(o.scheduled.slice(0, 16) + ":00+07:00").toISOString(), {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                  {"  "}
                  <span className="text-amber-600 font-normal">{he ? "מועד ההזמנה" : "order time"}</span>
                </div>
                {o.release_at && (
                  <div className="text-[11px] text-amber-700 mt-0.5">{untilRelease(o.release_at)}</div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span
                  className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                    o.method === "delivery" ? "bg-wine/10 text-wine" : "bg-soft text-ink/70"
                  }`}
                >
                  {o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
                </span>
                <span className="text-[11px] text-ink/45">
                  {o.total} {he ? "פריטים" : "items"}
                </span>
              </div>
            </div>
          ))}
        </div>
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
