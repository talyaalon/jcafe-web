import "server-only";
import type { OdooAdapter, Store, Category, Product } from "./types";
import { searchRead } from "./client";
import {
  PHUKET_COMPANY_ID,
  PHUKET_PRICELIST_ID,
  phuketStores,
  findPhuketStore,
} from "./phuket";
import { SHOP_POS_CATEGORY_IDS, orderKitchenCategories } from "./branches";
import { buildPricer } from "./pricelist";

// ===== OdooApiAdapter — שואב נתונים אמיתיים מ-ODOO (JSON-RPC) =====
// חנות = pos.config של פוקט. מוצרי החנות = available_in_pos + חברה [14,false]
// + pos_categ_ids שחותכים את הקטגוריות האפקטיביות של אותה חנות.
// כולל: תמחור לפי מחירון פוקט, תרגומי שמות HE, וסינון כפילויות TakeAway.

const HE = "he_IL";
const ODOO_BASE = (process.env.ODOO_URL ?? "").replace(/\/$/, "");
const imageUrl = (id: number) =>
  ODOO_BASE ? `${ODOO_BASE}/web/image/product.template/${id}/image_512` : undefined;

interface PosCategory {
  id: number;
  name: string;
  parent_id: [number, string] | false;
}

interface PosProductRow {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  pos_categ_ids: number[];
  categ_id: [number, string] | false;
  attribute_line_ids: number[];
  barcode: string | false;
  type: string;
  description_sale: string | false;
}

function stripHtml(v: string | false): string {
  if (!v) return "";
  return v
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===== קאשים בזיכרון התהליך (עם תפוגה) =====
const CACHE_TTL_MS = 5 * 60 * 1000;
const allowedCategsCache = new Map<number, { ids: number[]; ts: number }>();

async function allowedCategs(posConfigId: number): Promise<number[]> {
  const cached = allowedCategsCache.get(posConfigId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.ids;
  const rows = await searchRead<{ iface_available_categ_ids: number[] }>(
    "pos.config",
    [["id", "=", posConfigId]],
    ["iface_available_categ_ids"],
  );
  const ids = rows[0]?.iface_available_categ_ids ?? [];
  allowedCategsCache.set(posConfigId, { ids, ts: Date.now() });
  return ids;
}

const groceryConfigId = () =>
  phuketStores.find((s) => s.type === "grocery")!.posConfigId;

// חנות מכולת → כל הקטגוריות; חנות מטבח → רק תפריט ייחודי (פחות קטגוריות המכולת המשותפות).
async function effectiveCategs(
  store: (typeof phuketStores)[number],
): Promise<number[]> {
  const allowed = await allowedCategs(store.posConfigId);
  if (store.type === "grocery") return allowed;
  // מטבח: מחסרים את קטגוריות חנות ה-POS + קטגוריות המדף (Shop Items/Fresh/Wholesale).
  const shared = new Set([
    ...(await allowedCategs(groceryConfigId())),
    ...SHOP_POS_CATEGORY_IDS,
  ]);
  return allowed.filter((id) => !shared.has(id));
}

// סינון כפילויות Dine-in / TakeAway (משאירים את גרסת ה-Dine-in/בסיס).
function isTakeAway(name: string): boolean {
  const n = name.trim();
  return / TA$/i.test(n) || /take\s*-?\s*away/i.test(n);
}

// מפת שם+תיאור בעברית עבור מזהי תבניות מוצר.
async function heProductMap(
  ids: number[],
): Promise<Map<number, { name: string; desc: string }>> {
  if (!ids.length) return new Map();
  const rows = await searchRead<{ id: number; name: string; description_sale: string | false }>(
    "product.template",
    [["id", "in", ids]],
    ["id", "name", "description_sale"],
    { context: { lang: HE }, limit: ids.length },
  );
  return new Map(rows.map((r) => [r.id, { name: r.name, desc: stripHtml(r.description_sale) }]));
}

export const odooApiAdapter: OdooAdapter = {
  async getStores(): Promise<Store[]> {
    return phuketStores.map((s) => ({ ...s }));
  },

  async getCategories(storeId): Promise<Category[]> {
    const store = findPhuketStore(storeId);
    if (!store) return [];
    const ids = await effectiveCategs(store);
    if (!ids.length) return [];

    const [en, he] = await Promise.all([
      searchRead<PosCategory>("pos.category", [["id", "in", ids]], ["id", "name", "parent_id"]),
      searchRead<{ id: number; name: string }>(
        "pos.category",
        [["id", "in", ids]],
        ["id", "name"],
        { context: { lang: HE } },
      ),
    ]);
    const heMap = new Map(he.map((c) => [c.id, c.name]));

    const cats = en
      .filter((c) => !isTakeAway(c.name))
      .map((c) => ({
        id: String(c.id),
        slug: String(c.id),
        nameHe: heMap.get(c.id) ?? c.name,
        nameEn: c.name,
        storeId,
      }));
    // מטבח: מנות פתיחה ראשונות, שתייה אחרונה
    return store.type === "kitchen" ? orderKitchenCategories(cats) : cats;
  },

  async getProducts({ storeId, categoryId, search }): Promise<Product[]> {
    const store = findPhuketStore(storeId);
    if (!store) return [];
    const allowed = await effectiveCategs(store);
    const catFilter = categoryId ? [Number(categoryId)] : allowed;
    if (!catFilter.length) return [];

    const domain: unknown[] = [
      ["available_in_pos", "=", true],
      ["company_id", "in", [PHUKET_COMPANY_ID, false]],
      ["pos_categ_ids", "in", catFilter],
    ];
    // מוצרי המדף (Shop Items/Fresh/Wholesale) כבר נוסרו מ-effectiveCategs.
    if (search?.trim()) {
      const q = search.trim();
      domain.push("|", ["name", "ilike", q], ["barcode", "ilike", q]);
    }

    const [rows, pricer] = await Promise.all([
      searchRead<PosProductRow>(
        "product.template",
        domain,
        ["id", "name", "list_price", "qty_available", "pos_categ_ids", "categ_id", "attribute_line_ids", "barcode", "type", "description_sale"],
        { limit: 120, order: "name asc" },
      ),
      buildPricer(PHUKET_PRICELIST_ID),
    ]);

    const filtered = rows.filter((r) => !isTakeAway(r.name));
    const heMap = await heProductMap(filtered.map((r) => r.id));

    return filtered.map((r) => {
      const firstCat =
        (r.pos_categ_ids ?? []).find((id) => allowed.includes(id)) ??
        r.pos_categ_ids?.[0];
      const isKitchen = store.type === "kitchen";
      return {
        id: String(r.id),
        storeId,
        categoryId: firstCat != null ? String(firstCat) : "",
        nameHe: heMap.get(r.id)?.name ?? r.name,
        nameEn: r.name,
        descHe: heMap.get(r.id)?.desc || undefined,
        descEn: stripHtml(r.description_sale) || undefined,
        price: pricer(r.id, r.categ_id ? r.categ_id[0] : null, r.list_price ?? 0),
        qtyAvailable: isKitchen
          ? null
          : typeof r.qty_available === "number"
            ? r.qty_available
            : null,
        isKitchen,
        isFeatured: false,
        hasOptions: (r.attribute_line_ids?.length ?? 0) > 0,
        barcode: r.barcode || undefined,
        image: imageUrl(r.id),
      } satisfies Product;
    });
  },
};
