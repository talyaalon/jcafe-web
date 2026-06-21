import "server-only";
import { searchRead } from "./client";

// ===== מנוע מחירי Pricelist (משחזר את לוגיקת ODOO בצד-שרת) =====
// ODOO V18 חוסם קריאה מרחוק למתודות החישוב הפרטיות, ושדה ה-price הוסר —
// לכן אנו משחזרים את ההכרעה: variant → מוצר → קטגוריה (היררכיה) → גלובלי,
// עם סוגי חישוב fixed / percentage / formula (הנחה+תוספת+עיגול).
// מקור האמת היחיד למחיר — גם לתצוגה וגם לאימות הזמנה/תשלום בשרת.

interface PItem {
  applied_on: string; // 0_product_variant | 1_product | 2_product_category | 3_global
  compute_price: string; // fixed | percentage | formula
  fixed_price: number;
  percent_price: number;
  price_discount: number;
  price_surcharge: number;
  price_round: number;
  base: string; // list_price | standard_price | pricelist
  base_pricelist_id: [number, string] | false;
  categ_id: [number, string] | false;
  product_tmpl_id: [number, string] | false;
  min_quantity: number;
  date_start: string | false;
  date_end: string | false;
}

// קאש עם תפוגה (TTL) — כדי ששינוי מחיר/קטגוריה ב-ODOO יתעדכן תוך דקות.
const CACHE_TTL_MS = 5 * 60 * 1000;
const itemsCache = new Map<number, { items: PItem[]; ts: number }>();
let categParent: { map: Map<number, number | null>; ts: number } | null = null;

async function getItems(pricelistId: number): Promise<PItem[]> {
  const cached = itemsCache.get(pricelistId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.items;
  const rows = await searchRead<PItem>(
    "product.pricelist.item",
    [["pricelist_id", "=", pricelistId]],
    [
      "applied_on",
      "compute_price",
      "fixed_price",
      "percent_price",
      "price_discount",
      "price_surcharge",
      "price_round",
      "base",
      "base_pricelist_id",
      "categ_id",
      "product_tmpl_id",
      "min_quantity",
      "date_start",
      "date_end",
    ],
    { limit: 8000 },
  );
  itemsCache.set(pricelistId, { items: rows, ts: Date.now() });
  return rows;
}

// היררכיית product.category (פנימית) — להתאמת כללי קטגוריה לאב-קדמון.
async function getCategParent(): Promise<Map<number, number | null>> {
  if (categParent && Date.now() - categParent.ts < CACHE_TTL_MS) return categParent.map;
  const rows = await searchRead<{ id: number; parent_id: [number, string] | false }>(
    "product.category",
    [],
    ["parent_id"],
    { limit: 5000 },
  );
  const m = new Map<number, number | null>();
  for (const r of rows) m.set(r.id, r.parent_id ? r.parent_id[0] : null);
  categParent = { map: m, ts: Date.now() };
  return m;
}

const inDate = (it: PItem, today: string) =>
  (!it.date_start || String(it.date_start).slice(0, 10) <= today) &&
  (!it.date_end || String(it.date_end).slice(0, 10) >= today);

/** מחשב מחיר סופי למוצר לפי מזהה תבנית + קטגוריה פנימית + מחיר בסיס (list_price). */
export type Pricer = (templateId: number, categId: number | null, listPrice: number) => number;

export async function buildPricer(pricelistId: number | null): Promise<Pricer> {
  if (!pricelistId) return (_t, _c, list) => list;

  const [items, parents] = await Promise.all([getItems(pricelistId), getCategParent()]);
  const today = new Date().toISOString().slice(0, 10);
  const active = items.filter((it) => (it.min_quantity ?? 0) <= 1 && inDate(it, today));

  const byTmpl = new Map<number, PItem>();
  const byCateg = new Map<number, PItem>();
  let globalRule: PItem | null = null;
  for (const it of active) {
    if (it.applied_on === "1_product" && it.product_tmpl_id) {
      if (!byTmpl.has(it.product_tmpl_id[0])) byTmpl.set(it.product_tmpl_id[0], it);
    } else if (it.applied_on === "2_product_category" && it.categ_id) {
      if (!byCateg.has(it.categ_id[0])) byCateg.set(it.categ_id[0], it);
    } else if (it.applied_on === "3_global") {
      if (!globalRule) globalRule = it;
    }
    // 0_product_variant — לא נתמך ברמת התבנית (נדיר); נופל לכלל הכללי/בסיס.
  }

  // שרשרת קטגוריות מהמוצר כלפי מעלה (own → parent → ...)
  const ancestors = (categId: number | null): number[] => {
    const out: number[] = [];
    let cur: number | null = categId;
    const seen = new Set<number>();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      out.push(cur);
      cur = parents.get(cur) ?? null;
    }
    return out;
  };

  const apply = (it: PItem, listPrice: number): number => {
    // base — בכל מחירוני החזית הוא list_price; pricelist/standard_price נדירים ולא בשימוש כאן.
    const base = listPrice;
    let price: number;
    if (it.compute_price === "fixed") {
      price = it.fixed_price;
    } else if (it.compute_price === "percentage") {
      price = base * (1 - (it.percent_price ?? 0) / 100);
    } else {
      // formula: הנחה (אחוז) + תוספת קבועה + עיגול
      price = base * (1 - (it.price_discount ?? 0) / 100) + (it.price_surcharge ?? 0);
      if (it.price_round) price = Math.round(price / it.price_round) * it.price_round;
    }
    return Math.max(0, price);
  };

  return (templateId, categId, listPrice) => {
    const t = byTmpl.get(templateId);
    if (t) return apply(t, listPrice);
    if (byCateg.size) {
      for (const cat of ancestors(categId)) {
        const c = byCateg.get(cat);
        if (c) return apply(c, listPrice);
      }
    }
    if (globalRule) return apply(globalRule, listPrice);
    return listPrice;
  };
}

// ===== תמחור הזמנה בצד-שרת (מקור אמת לאימות) =====
// מחשב את מחיר הבסיס המהימן לכל פריט מ-ODOO + ה-Pricelist של הסניף.
// פריט רגיל → נכפה מחיר השרת. פריט עם תוספות (id מכיל "|") → מחיר הלקוח
// מתקבל רק אם הוא ≥ מחיר הבסיס (התוספות מוסיפות), אחרת נכפה הבסיס.
export interface OrderItemIn {
  id: string;
  qty: number;
  price: number;
}
export interface PricedOrderItem {
  templateId: number;
  qty: number;
  clientPrice: number;
  basePrice: number;
  unitPrice: number;
}

export async function priceOrderItems(
  pricelistId: number | null,
  items: OrderItemIn[],
): Promise<{ priced: PricedOrderItem[]; total: number; tampered: boolean }> {
  const tmplIds = [
    ...new Set(items.map((i) => Number(String(i.id).split("|")[0])).filter((n) => n > 0)),
  ];
  const [pricer, rows] = await Promise.all([
    buildPricer(pricelistId),
    tmplIds.length
      ? searchRead<{ id: number; list_price: number; categ_id: [number, string] | false }>(
          "product.template",
          [["id", "in", tmplIds]],
          ["id", "list_price", "categ_id"],
          { limit: tmplIds.length },
        )
      : Promise.resolve([]),
  ]);
  const baseOf = new Map<number, number>();
  for (const r of rows) baseOf.set(r.id, pricer(r.id, r.categ_id ? r.categ_id[0] : null, r.list_price ?? 0));

  let tampered = false;
  const priced = items.map((i) => {
    const templateId = Number(String(i.id).split("|")[0]);
    const basePrice = baseOf.get(templateId) ?? 0;
    const hasOptions = String(i.id).includes("|") && !!String(i.id).split("|")[1];
    let unitPrice: number;
    if (hasOptions) {
      // התוספות רק מוסיפות — מחיר נמוך מהבסיס = חשד לזיוף
      if (i.price < basePrice - 0.01) {
        tampered = true;
        unitPrice = basePrice;
      } else {
        unitPrice = i.price;
      }
    } else {
      unitPrice = basePrice;
      if (Math.abs(i.price - basePrice) > 0.01) tampered = true;
    }
    return { templateId, qty: i.qty, clientPrice: i.price, basePrice, unitPrice };
  });
  const total = priced.reduce((s, p) => s + p.unitPrice * p.qty, 0);
  return { priced, total, tampered };
}
