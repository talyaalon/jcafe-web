import "server-only";
import { executeKw, searchRead } from "./client";
import { PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "./phuket";

// ===== יצירת לקוח + הזמנה (Sales Order) ב-ODOO =====

export interface OrderCustomer {
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  zip?: string;
}

export interface OrderItem {
  templateId: number; // product.template id
  qty: number;
  unitPrice: number; // מחיר בסיס (לפני הנחה)
  discount?: number; // אחוז הנחה (שדה discount של sale.order.line)
  name: string;
  storeName: string;
}

// תגיות לקוח (res.partner.category) — חיפוש/יצירה, עם קאש לפי שם.
const tagCache = new Map<string, number>();
async function ensureTag(name: string): Promise<number> {
  const cached = tagCache.get(name);
  if (cached) return cached;
  const found = await searchRead<{ id: number }>(
    "res.partner.category",
    [["name", "=", name]],
    ["id"],
    { limit: 1 },
  );
  const id = found[0]?.id ?? (await executeKw<number>("res.partner.category", "create", [{ name }]));
  tagCache.set(name, id);
  return id;
}

// בדיקת קיום לקוח לפי מייל → טלפון; יצירה אם לא קיים.
// מייל קודם — מזהה ייחודי יותר ללקוח (טלפון עלול להיות משותף למשפחה),
// כך נמנע מיזוג של שני לקוחות שונים בעלי אותו טלפון.
// תמיד מתייג: "Website" (לכל לקוחות האתר) + תג הסניף שממנו הגיע (Phuket / Samui / ...).
export async function findOrCreatePartner(c: OrderCustomer, branch = "Phuket"): Promise<number> {
  const [websiteTag, branchTag] = await Promise.all([ensureTag("Website"), ensureTag(branch)]);
  const tagIds = [websiteTag, branchTag];

  let existing: { id: number } | undefined;
  if (c.email) {
    existing = (
      await searchRead<{ id: number }>("res.partner", [["email", "=", c.email]], ["id"], { limit: 1 })
    )[0];
  }
  if (!existing && c.phone) {
    existing = (
      await searchRead<{ id: number }>("res.partner", [["phone", "=", c.phone]], ["id"], { limit: 1 })
    )[0];
  }

  if (existing) {
    // קיים → שימוש חוזר + הוספת תגיות (link, לא מוחק קיימות). company_id=false = משותף.
    await executeKw("res.partner", "write", [
      [existing.id],
      { category_id: tagIds.map((id) => [4, id]), company_id: false },
    ]);
    return existing.id;
  }

  const vals: Record<string, unknown> = {
    name: c.name,
    email: c.email || false,
    phone: c.phone || false,
    company_id: false, // לקוח משותף לכל החברות
    category_id: [[6, 0, tagIds]],
  };
  if (c.street) vals.street = c.street;
  if (c.city) vals.city = c.city;
  if (c.zip) vals.zip = c.zip;
  const newId = await executeKw<number>("res.partner", "create", [vals]);
  // אכיפה מחדש של company_id=false (flush) — מונע "Incompatible companies" בהזמנה הראשונה.
  await executeKw("res.partner", "write", [[newId], { company_id: false }]);
  return newId;
}

// ===== שליפת כל לקוחות האתר מ-ODOO (לתצוגת מנהל) =====
export interface WebsiteCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  branches: string[]; // תגי סניף (ללא "Website")
  created: string;
  source: "site" | "odoo"; // "site" = נוצר דרך האתר (תג Website); "odoo" = נמשך מ-ODOO
}

export async function getWebsiteCustomers(): Promise<WebsiteCustomer[]> {
  const [websiteTag, phuketTag] = await Promise.all([ensureTag("Website"), ensureTag("Phuket")]);
  const rows = await searchRead<{
    id: number;
    name: string;
    email: string | false;
    phone: string | false;
    category_id: number[];
    create_date: string;
  }>(
    "res.partner",
    [["category_id", "in", [websiteTag, phuketTag]]],
    ["id", "name", "email", "phone", "category_id", "create_date"],
    { limit: 1000, order: "create_date desc" },
  );

  const catIds = [...new Set(rows.flatMap((r) => r.category_id))];
  const cats = catIds.length
    ? await searchRead<{ id: number; name: string }>(
        "res.partner.category",
        [["id", "in", catIds]],
        ["id", "name"],
      )
    : [];
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email || "",
    phone: r.phone || "",
    branches: r.category_id
      .map((id) => catName.get(id))
      .filter((n): n is string => !!n && n !== "Website"),
    created: r.create_date,
    source: r.category_id.includes(websiteTag) ? ("site" as const) : ("odoo" as const),
  }));
}

// מיפוי product.template → product.product (variant) להזמנה.
async function variantMap(tmplIds: number[]): Promise<Map<number, number>> {
  if (!tmplIds.length) return new Map();
  const rows = await searchRead<{ id: number; product_tmpl_id: [number, string] }>(
    "product.product",
    [["product_tmpl_id", "in", tmplIds]],
    ["id", "product_tmpl_id"],
  );
  const m = new Map<number, number>();
  for (const r of rows) {
    const t = Array.isArray(r.product_tmpl_id) ? r.product_tmpl_id[0] : (r.product_tmpl_id as number);
    if (!m.has(t)) m.set(t, r.id);
  }
  return m;
}

export interface CreatedOrder {
  id: number;
  name: string;
  confirmed: boolean;
}

// יצירת Sales Order מקובצת לפי חנות (section per store) + אישור אוטומטי.
export async function createOrder(opts: {
  partnerId: number;
  items: OrderItem[];
  notes?: string;
  companyId?: number;
  pricelistId?: number;
}): Promise<CreatedOrder> {
  const {
    partnerId,
    items,
    notes,
    companyId = PHUKET_COMPANY_ID,
    pricelistId = PHUKET_PRICELIST_ID,
  } = opts;
  const tmplIds = [...new Set(items.map((i) => i.templateId))];
  const vmap = await variantMap(tmplIds);

  const stores = [...new Set(items.map((i) => i.storeName))];
  // useDiscountField=true → שדה discount הנייטיבי של ODOO; false → fallback למחיר אחרי הנחה
  const buildLines = (useDiscountField: boolean): unknown[] => {
    const out: unknown[] = [];
    for (const store of stores) {
      out.push([0, 0, { display_type: "line_section", name: store }]);
      for (const it of items.filter((i) => i.storeName === store)) {
        const variant = vmap.get(it.templateId);
        if (!variant) continue;
        const disc = it.discount && it.discount > 0 ? it.discount : 0;
        const line: Record<string, unknown> = {
          product_id: variant,
          product_uom_qty: it.qty,
          name: it.name,
        };
        if (disc && useDiscountField) {
          line.price_unit = it.unitPrice;
          line.discount = disc;
        } else {
          line.price_unit = disc
            ? Math.round(it.unitPrice * (1 - disc / 100) * 100) / 100
            : it.unitPrice;
        }
        out.push([0, 0, line]);
      }
    }
    return out;
  };

  const soVals: Record<string, unknown> = {
    partner_id: partnerId,
    company_id: companyId,
    pricelist_id: pricelistId,
  };
  if (notes) soVals.note = notes;

  // ניסיון עם שדה discount הנייטיבי; אם ODOO דוחה — נופלים למחיר אחרי הנחה (לא שובר הזמנה)
  let soId: number;
  try {
    soId = await executeKw<number>("sale.order", "create", [{ ...soVals, order_line: buildLines(true) }]);
  } catch {
    soId = await executeKw<number>("sale.order", "create", [{ ...soVals, order_line: buildLines(false) }]);
  }

  let confirmed = false;
  try {
    await executeKw("sale.order", "action_confirm", [[soId]]);
    confirmed = true;
  } catch {
    // נשאר כהצעת מחיר (draft) אם האישור נכשל — לא מפילים את ההזמנה.
  }

  // אישור המשלוח כדי להוריד את הכמות מה-ON HAND של המוצרים — best-effort, לא חוסם.
  if (confirmed) {
    try {
      await validateDeliveries(soId);
    } catch (e) {
      console.error("[createOrder] delivery validation failed", e);
    }
  }

  const so = (await searchRead<{ name: string }>("sale.order", [["id", "=", soId]], ["name"], { limit: 1 }))[0];
  return { id: soId, name: so?.name ?? `S${soId}`, confirmed };
}

// מאמת את משלוחי ההזמנה (stock.picking) — קובע כמות שבוצעה = ביקוש ומאשר,
// כך שה-ON HAND של המוצרים יורד מיד. עוטף כל שלב ב-try כדי לא לשבור הזמנה.
async function validateDeliveries(soId: number): Promise<void> {
  const pickings = await searchRead<{ id: number }>(
    "stock.picking",
    [
      ["sale_id", "=", soId],
      ["state", "not in", ["done", "cancel"]],
    ],
    ["id"],
    { limit: 20 },
  );
  for (const pk of pickings) {
    const moves = await searchRead<{ id: number; product_uom_qty: number }>(
      "stock.move",
      [["picking_id", "=", pk.id]],
      ["id", "product_uom_qty"],
      { limit: 200 },
    );
    for (const m of moves) {
      // ODOO 17/18: שדה הכמות שבוצעה הוא "quantity"
      try {
        await executeKw("stock.move", "write", [[m.id], { quantity: m.product_uom_qty }]);
      } catch {
        /* ignore — נמשיך לאישור בכל מקרה */
      }
    }
    // אישור המשלוח, תוך דילוג על אשף ה-backorder (הכמות = הביקוש)
    try {
      await executeKw("stock.picking", "button_validate", [[pk.id]], {
        context: { skip_backorder: true, skip_sms: true, skip_immediate: true },
      });
    } catch (e) {
      console.error("[validateDeliveries] picking", pk.id, e);
    }
  }
}
