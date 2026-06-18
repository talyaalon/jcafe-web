import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase/server";

interface Item {
  name: string;
  qty: number;
  storeId?: string;
  barcode?: string | null;
  scanned?: number;
  status?: string;
  [k: string]: unknown;
}

const isGrocery = (it: Item) => (it.storeId ?? "") === "grocery";
const scannedOf = (it: Item) =>
  typeof it.scanned === "number" ? it.scanned : it.status === "done" ? it.qty : 0;
const norm = (s: string) => s.trim().replace(/\s+/g, "");

// תמונת מצב של פריטי המכולת לסנכרון הלקוח
function snapshot(items: Item[]) {
  return items
    .map((it, index) => ({ it, index }))
    .filter((x) => isGrocery(x.it))
    .map(({ it, index }) => {
      const scanned = scannedOf(it);
      return {
        index,
        name: it.name,
        qty: it.qty,
        scanned,
        done: scanned >= it.qty,
        hasBarcode: !!(it.barcode && String(it.barcode).trim()),
      };
    });
}

// POST /api/picker/scan — סריקת ברקוד (ספירה פר-יחידה) או סימון/איפוס ידני.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    barcode?: string;
    index?: number;
    action?: "scan" | "set" | "reset";
  };
  const orderId = String(body.orderId ?? "");
  if (!orderId) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data } = await sb.from("pos_orders").select("items").eq("id", orderId).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "notfound" }, { status: 404 });
  const items = (data.items as Item[]) ?? [];

  const action = body.action ?? "scan";

  // ---- סימון/איפוס ידני (מוצרים ללא ברקוד) ----
  if (action === "set" || action === "reset") {
    const idx = Number(body.index);
    if (!Number.isInteger(idx) || !items[idx] || !isGrocery(items[idx])) {
      return NextResponse.json({ ok: false, error: "badindex" }, { status: 400 });
    }
    const it = items[idx];
    const scanned = action === "set" ? it.qty : 0;
    items[idx] = { ...it, scanned, status: scanned >= it.qty ? "done" : "pending" };
    await sb.from("pos_orders").update({ items }).eq("id", orderId);
    return NextResponse.json({ ok: true, items: snapshot(items) });
  }

  // ---- סריקת ברקוד ----
  const code = norm(String(body.barcode ?? ""));
  if (!code) return NextResponse.json({ ok: false, error: "empty", items: snapshot(items) });

  // התאמת ברקוד בין פריטי המכולת
  const matches = items
    .map((it, index) => ({ it, index }))
    .filter((x) => isGrocery(x.it) && x.it.barcode && norm(String(x.it.barcode)) === code);

  if (matches.length === 0) {
    // לא נמצא מוצר תואם בהזמנה — שגיאה
    return NextResponse.json({ ok: false, error: "unknown", items: snapshot(items) });
  }

  // עדיפות לפריט שטרם הושלם
  const open = matches.find((m) => scannedOf(m.it) < m.it.qty);
  if (!open) {
    const m = matches[0];
    return NextResponse.json({
      ok: false,
      error: "already",
      name: m.it.name,
      qty: m.it.qty,
      items: snapshot(items),
    });
  }

  const it = open.it;
  const scanned = scannedOf(it) + 1;
  const done = scanned >= it.qty;
  items[open.index] = { ...it, scanned, status: done ? "done" : "preparing" };
  await sb.from("pos_orders").update({ items }).eq("id", orderId);

  return NextResponse.json({
    ok: true,
    matched: { index: open.index, name: it.name, qty: it.qty, scanned, done },
    items: snapshot(items),
  });
}
