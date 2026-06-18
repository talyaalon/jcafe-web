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
  unitPrice: number;
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

// בדיקת קיום לקוח לפי טלפון → מייל; יצירה אם לא קיים.
// תמיד מתייג: "Website" (לכל לקוחות האתר) + תג הסניף שממנו הגיע (Phuket / Samui / ...).
export async function findOrCreatePartner(c: OrderCustomer, branch = "Phuket"): Promise<number> {
  const [websiteTag, branchTag] = await Promise.all([ensureTag("Website"), ensureTag(branch)]);
  const tagIds = [websiteTag, branchTag];

  let existing: { id: number } | undefined;
  if (c.phone) {
    existing = (
      await searchRead<{ id: number }>("res.partner", [["phone", "=", c.phone]], ["id"], { limit: 1 })
    )[0];
  }
  if (!existing && c.email) {
    existing = (
      await searchRead<{ id: number }>("res.partner", [["email", "=", c.email]], ["id"], { limit: 1 })
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
  return executeKw<number>("res.partner", "create", [vals]);
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
}): Promise<CreatedOrder> {
  const { partnerId, items, notes } = opts;
  const tmplIds = [...new Set(items.map((i) => i.templateId))];
  const vmap = await variantMap(tmplIds);

  const stores = [...new Set(items.map((i) => i.storeName))];
  const lines: unknown[] = [];
  for (const store of stores) {
    lines.push([0, 0, { display_type: "line_section", name: store }]);
    for (const it of items.filter((i) => i.storeName === store)) {
      const variant = vmap.get(it.templateId);
      if (!variant) continue;
      lines.push([
        0,
        0,
        {
          product_id: variant,
          product_uom_qty: it.qty,
          price_unit: it.unitPrice,
          name: it.name,
        },
      ]);
    }
  }

  const soVals: Record<string, unknown> = {
    partner_id: partnerId,
    company_id: PHUKET_COMPANY_ID,
    pricelist_id: PHUKET_PRICELIST_ID,
    order_line: lines,
  };
  if (notes) soVals.note = notes;

  const soId = await executeKw<number>("sale.order", "create", [soVals]);

  let confirmed = false;
  try {
    await executeKw("sale.order", "action_confirm", [[soId]]);
    confirmed = true;
  } catch {
    // נשאר כהצעת מחיר (draft) אם האישור נכשל — לא מפילים את ההזמנה.
  }

  const so = (await searchRead<{ name: string }>("sale.order", [["id", "=", soId]], ["name"], { limit: 1 }))[0];
  return { id: soId, name: so?.name ?? `S${soId}`, confirmed };
}
