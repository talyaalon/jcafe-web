"use client";

import { useEffect, useRef, useState } from "react";

export interface ScanItem {
  index: number;
  name: string;
  qty: number;
  scanned: number;
  done: boolean;
  hasBarcode: boolean;
  image?: string;
}

type Msg = { kind: "ok" | "err"; text: string } | null;

// ביפ קצר (הצלחה) או באז נמוך (שגיאה) — ללא קובץ קול.
function beep(ok: boolean) {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = ok ? "sine" : "square";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.12 : 0.3));
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

export function GroceryScanner({
  orderId,
  storeName,
  initial,
  he,
}: {
  orderId: string;
  storeName: string;
  initial: ScanItem[];
  he: boolean;
}) {
  const [items, setItems] = useState<ScanItem[]>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // השארת הפוקוס על תיבת הסריקה (הסורק מתנהג כמקלדת).
  const focusInput = () => inputRef.current?.focus();
  useEffect(() => {
    focusInput();
    const onFocus = () => focusInput();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  const scannedUnits = items.reduce((s, i) => s + Math.min(i.scanned, i.qty), 0);

  function showMsg(m: Msg) {
    setMsg(m);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 2600);
  }

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/picker/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...payload }),
      });
      const data = await res.json();
      if (Array.isArray(data.items)) {
        // שמירת כתובות התמונה הקיימות (ה-API לא מחזיר אותן)
        setItems((prev) =>
          data.items.map((s: ScanItem) => ({
            ...s,
            image: prev.find((p) => p.index === s.index)?.image,
          })),
        );
      }
      return data;
    } finally {
      setBusy(false);
      focusInput();
    }
  }

  async function onScan(code: string) {
    const barcode = code.trim();
    if (!barcode) return;
    const data = await send({ barcode, action: "scan" });
    if (data.ok && data.matched) {
      beep(true);
      setFlash(data.matched.index);
      setTimeout(() => setFlash(null), 700);
      const m = data.matched;
      showMsg({
        kind: "ok",
        text: m.done
          ? `${he ? "הושלם" : "Done"}: ${m.name} (${m.qty}/${m.qty})`
          : `${m.name} — ${m.scanned}/${m.qty}`,
      });
    } else {
      beep(false);
      const err = data.error as string;
      showMsg({
        kind: "err",
        text:
          err === "already"
            ? `${he ? "כבר נסרק במלואו" : "Already fully scanned"}: ${data.name ?? ""}`
            : err === "unknown"
              ? he
                ? "❌ מוצר לא בהזמנה / ברקוד לא מזוהה"
                : "❌ Product not in this order"
              : he
                ? "❌ סריקה נכשלה"
                : "❌ Scan failed",
      });
    }
  }

  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      <div className="flex justify-between items-center bg-wine text-white px-4 py-2 text-sm font-bold">
        <span>🛒 {storeName} ({he ? "ליקוט בסריקה" : "Scan picking"})</span>
        <span>
          {he ? "נסרקו" : "Scanned"} {scannedUnits}/{totalUnits}
        </span>
      </div>

      {/* תיבת סריקה — הסורק הידני שולח את הברקוד + Enter */}
      <div className="p-3 border-b border-line bg-soft" onClick={focusInput}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            autoFocus
            inputMode="none"
            placeholder={he ? "📷 סרוק ברקוד כאן…" : "📷 Scan barcode here…"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value;
                (e.target as HTMLInputElement).value = "";
                onScan(v);
              }
            }}
            className="flex-1 border-2 border-wine/40 focus:border-wine rounded-lg px-3 py-2.5 text-sm outline-none bg-white"
          />
        </div>
        {msg && (
          <div
            className={`mt-2 text-sm font-bold rounded-lg px-3 py-2 ${
              msg.kind === "ok"
                ? "bg-green-50 text-brand-green border border-brand-green/40"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      <ul>
        {items.map((it) => (
          <li
            key={it.index}
            className={`flex items-center gap-3 px-4 py-2.5 border-t border-line/60 transition-colors ${
              flash === it.index ? "bg-green-100" : ""
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full flex-none ${
                it.done ? "bg-brand-green" : it.scanned > 0 ? "bg-amber-400" : "bg-ink/25"
              }`}
            />
            <div className="w-9 h-9 rounded-lg bg-soft border border-line overflow-hidden grid place-items-center flex-none">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-ink/25 text-sm">🛍️</span>
              )}
            </div>
            <span className="flex-1 text-sm">
              {it.name}
              {!it.hasBarcode && (
                <span className="ms-2 text-[10px] text-amber-600 font-bold">
                  {he ? "(ללא ברקוד)" : "(no barcode)"}
                </span>
              )}
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                it.done ? "text-brand-green" : it.scanned > 0 ? "text-amber-600" : "text-ink/50"
              }`}
            >
              {it.scanned}/{it.qty}
            </span>
            {/* סימון/איפוס ידני (לגיבוי / מוצרים ללא ברקוד) */}
            {it.done ? (
              <button
                disabled={busy}
                onClick={() => send({ index: it.index, action: "reset" })}
                className="text-xs font-bold rounded-lg px-2 py-1 border border-line text-ink/50 hover:border-wine"
                title={he ? "אפס" : "Reset"}
              >
                ↺
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => send({ index: it.index, action: "set" })}
                className="text-xs font-bold rounded-lg px-2.5 py-1 border border-line text-ink/60 hover:border-wine"
                title={he ? "סמן ידנית" : "Mark manually"}
              >
                ✓
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
