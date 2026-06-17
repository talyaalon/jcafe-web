import type { Locale } from "@/i18n/config";
import { type PosOrder, isGrocery, isKitchen } from "@/lib/supabase/pos";
import { setPosStatus, setKitchenStatus } from "@/lib/staff/actions";

const STATUSES: Record<"pos" | "kitchen", string[]> = {
  pos: ["new", "picking", "ready"],
  kitchen: ["new", "preparing", "ready"],
};

function labels(he: boolean): Record<string, string> {
  return {
    new: he ? "חדש" : "New",
    picking: he ? "בליקוט" : "Picking",
    preparing: he ? "בהכנה" : "Preparing",
    ready: he ? "מוכן" : "Ready",
  };
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function StaffBoard({
  locale,
  type,
  orders,
}: {
  locale: Locale;
  type: "pos" | "kitchen";
  orders: PosOrder[];
}) {
  const he = locale === "he";
  const L = labels(he);
  const action = type === "pos" ? setPosStatus : setKitchenStatus;
  const statuses = STATUSES[type];
  const match = (storeId: string) => (type === "pos" ? isGrocery(storeId) : isKitchen(storeId));

  const cards = orders
    .map((o) => ({ o, view: o.items.filter((i) => match(i.storeId)) }))
    .filter((x) => x.view.length > 0);

  if (cards.length === 0) {
    return (
      <p className="p-8 text-center text-ink/50">{he ? "אין הזמנות פעילות" : "No active orders"}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
      {cards.map(({ o, view }) => {
        const status = type === "pos" ? o.pos_status : o.kitchen_status;
        const ready = status === "ready";
        return (
          <div
            key={o.id}
            className={`rounded-xl border p-4 ${ready ? "border-brand-green bg-green-50" : "border-line bg-white"}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-extrabold text-wine">{o.order_name || "—"}</div>
                <div className="text-xs text-ink/60">
                  {o.customer_name} · {hhmm(o.created_at)}
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-soft text-ink/70">
                {o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
              </span>
            </div>
            {o.scheduled_for && (
              <div className="text-[11px] text-amber-700 mt-1 font-bold">🗓 {o.scheduled_for}</div>
            )}

            <ul className="mt-3 space-y-1 text-sm border-t border-line pt-2">
              {view.map((it, idx) => (
                <li key={idx} className="flex justify-between gap-2">
                  <span className="leading-tight">{it.name}</span>
                  <span className="font-bold flex-none">×{it.qty}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 mt-3 flex-wrap">
              {statuses.map((s) => (
                <form key={s} action={action}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border transition ${
                      status === s
                        ? "bg-wine text-white border-wine"
                        : "border-line text-ink/60 hover:border-wine"
                    }`}
                  >
                    {L[s]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
