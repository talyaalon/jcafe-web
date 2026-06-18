import "server-only";
import type { Store, Category, Product } from "./types";
import { searchRead } from "./client";
import { buildPricer } from "./pricelist";

// ===== טעינת נתוני סניף גנרית (כל חברה/סניף עם ה-POS שלה) =====
// סניף = res.company; חנות = pos.config של אותה חברה (עם מחירון).
// מוצרים נשאבים לפי available_in_pos + company_id + קטגוריות החנות.

const HE = "he_IL";
const ODOO_BASE = (process.env.ODOO_URL ?? "").replace(/\/$/, "");
const imageUrl = (id: number) =>
  ODOO_BASE ? `${ODOO_BASE}/web/image/product.template/${id}/image_512` : undefined;

// עקיפות סוג חנות היכן שהזיהוי האוטומטי טועה (לפי שם).
const TYPE_OVERRIDE: Record<number, "kitchen" | "grocery"> = {
  33: "kitchen", // Banana loti Shop — מסעדה (לא מכולת)
};

function storeType(id: number, name: string): "kitchen" | "grocery" {
  if (TYPE_OVERRIDE[id]) return TYPE_OVERRIDE[id];
  const n = name.toLowerCase();
  if (/shop|store|grocery|market|mini\s*mart|מכולת/.test(n)) return "grocery";
  return "kitchen";
}

function stripHtml(v: string | false): string {
  return v ? v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}
function isTakeAway(name: string): boolean {
  const n = name.trim();
  return / TA$/i.test(n) || /take\s*-?\s*away/i.test(n);
}

export interface BranchConfig {
  id: number;
  name: string;
  pricelistId: number | null;
  type: "kitchen" | "grocery";
}
export interface Branch {
  companyId: number;
  name: string;
  configs: BranchConfig[];
}

// קישורים יפים לכל סניף: slug → company id ב-ODOO.
export const BRANCH_SLUGS: Record<string, number> = {
  phuket: 14,
  bangkok: 15,
  sukhumvit: 15,
  jcafe: 15,
  banglumpoo: 16,
  phangan: 13,
  "koh-phangan": 13,
  samui: 19,
  chiangmai: 18,
  "chiang-mai": 18,
};

// שם ה-slug המועדף לכל סניף (להצגה/קישור)
export const COMPANY_SLUG: Record<number, string> = {
  14: "phuket",
  15: "bangkok",
  16: "banglumpoo",
  13: "phangan",
  19: "samui",
  18: "chiangmai",
};

// תג הלקוח (res.partner.category) לכל סניף — נקי ועקבי.
export const BRANCH_TAG: Record<number, string> = {
  14: "Phuket",
  15: "Bangkok",
  16: "Banglumpoo",
  13: "Koh Phangan",
  19: "Samui",
  18: "Chiang Mai",
};

// קבלת מזהה חברה מפרמטר ה-route (מספר או slug).
export function resolveBranch(param: string): number | null {
  const n = Number(param);
  if (Number.isFinite(n) && n > 0) return n;
  return BRANCH_SLUGS[param.toLowerCase()] ?? null;
}

export async function getBranches(): Promise<Branch[]> {
  const rows = await searchRead<{
    id: number;
    name: string;
    company_id: [number, string] | false;
    pricelist_id: [number, string] | false;
  }>("pos.config", [], ["id", "name", "company_id", "pricelist_id"], { limit: 200 });

  const byCo = new Map<number, Branch>();
  for (const c of rows) {
    if (!c.company_id || !c.pricelist_id) continue; // רק חנויות עם מחירון
    const [cid, cname] = c.company_id;
    if (!byCo.has(cid)) byCo.set(cid, { companyId: cid, name: cname, configs: [] });
    byCo.get(cid)!.configs.push({
      id: c.id,
      name: c.name,
      pricelistId: c.pricelist_id ? c.pricelist_id[0] : null,
      type: storeType(c.id, c.name),
    });
  }
  return [...byCo.values()]
    .filter((b) => b.configs.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ===== קאשים =====
const allowedCache = new Map<number, number[]>();

async function allowedCategs(configId: number): Promise<number[]> {
  const c = allowedCache.get(configId);
  if (c) return c;
  const rows = await searchRead<{ iface_available_categ_ids: number[] }>(
    "pos.config",
    [["id", "=", configId]],
    ["iface_available_categ_ids"],
  );
  const ids = rows[0]?.iface_available_categ_ids ?? [];
  allowedCache.set(configId, ids);
  return ids;
}

async function loadCategories(catIds: number[], storeId: string): Promise<Category[]> {
  if (!catIds.length) return [];
  const [en, he] = await Promise.all([
    searchRead<{ id: number; name: string }>("pos.category", [["id", "in", catIds]], ["id", "name"]),
    searchRead<{ id: number; name: string }>("pos.category", [["id", "in", catIds]], ["id", "name"], {
      context: { lang: HE },
    }),
  ]);
  const heMap = new Map(he.map((c) => [c.id, c.name]));
  return en
    .filter((c) => !isTakeAway(c.name))
    .map((c) => ({
      id: String(c.id),
      slug: String(c.id),
      nameHe: heMap.get(c.id) ?? c.name,
      nameEn: c.name,
      storeId,
    }));
}

interface ProdRow {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  pos_categ_ids: number[];
  categ_id: [number, string] | false;
  barcode: string | false;
  description_sale: string | false;
}

async function loadProducts(
  companyId: number,
  cfg: BranchConfig,
  effective: number[],
): Promise<Product[]> {
  if (!effective.length) return [];
  const domain: unknown[] = [
    ["available_in_pos", "=", true],
    ["company_id", "in", [companyId, false]],
    ["pos_categ_ids", "in", effective],
  ];
  // חנות מטבח (מסעדה) — רק מנות מתפריט (קטגוריות ציבוריות של תפריט).
  // מוצרי חנות/מדף (כמו במבה, גזר, פמוטים) משויכים לקטגוריות POS משותפות אך
  // אינם תחת שורש תפריט — לכן יוחרגו מהמטבח ויופיעו רק ב"מכולת".
  if (cfg.type === "kitchen") {
    domain.push(["public_categ_ids", "child_of", MENU_ROOT_IDS]);
  }
  const [rows, pricer] = await Promise.all([
    searchRead<ProdRow>(
      "product.template",
      domain,
      ["id", "name", "list_price", "qty_available", "pos_categ_ids", "categ_id", "barcode", "description_sale"],
      { limit: 500, order: "name asc" },
    ),
    buildPricer(cfg.pricelistId),
  ]);

  const filtered = rows.filter((r) => !isTakeAway(r.name));
  const heRows = filtered.length
    ? await searchRead<{ id: number; name: string; description_sale: string | false }>(
        "product.template",
        [["id", "in", filtered.map((r) => r.id)]],
        ["id", "name", "description_sale"],
        { context: { lang: HE }, limit: filtered.length },
      )
    : [];
  const heMap = new Map(heRows.map((r) => [r.id, { name: r.name, desc: stripHtml(r.description_sale) }]));
  const isKitchen = cfg.type === "kitchen";

  return filtered.map((r) => {
    const firstCat = (r.pos_categ_ids ?? []).find((id) => effective.includes(id)) ?? r.pos_categ_ids?.[0];
    return {
      id: String(r.id),
      storeId: String(cfg.id),
      categoryId: firstCat != null ? String(firstCat) : "",
      nameHe: heMap.get(r.id)?.name ?? r.name,
      nameEn: r.name,
      descHe: heMap.get(r.id)?.desc || undefined,
      descEn: stripHtml(r.description_sale) || undefined,
      price: pricer(r.id, r.categ_id ? r.categ_id[0] : null, r.list_price ?? 0),
      qtyAvailable: isKitchen ? null : typeof r.qty_available === "number" ? r.qty_available : null,
      isKitchen,
      isFeatured: false,
      barcode: r.barcode || undefined,
      image: imageUrl(r.id),
    } satisfies Product;
  });
}

export interface BranchBundle {
  store: Store;
  categories: Category[];
  products: Product[];
}

// קטגוריות ציבוריות עליונות של המכולת (eCommerce) — מוצרי חנות/מצרכים.
export const GROCERY_ROOT_IDS = [28, 49, 60, 45, 41, 56, 81, 80];
// שורשי קטגוריות התפריט (מנות מסעדה) — J Cafe / Jdeli / Catering / Habsarit / Jcafe Phuket.
// כל מוצר תחת שורש כזה = מנת מסעדה (מטבח); כל השאר שמפורסם = מוצר חנות (מכולת).
export const MENU_ROOT_IDS = [64, 233, 248, 299, 321];

// חנות מכולת מבוססת eCommerce (website_published) לסניף — כל קטלוג המצרכים.
export async function getGroceryBundle(
  companyId: number,
  pricelistId: number | null,
): Promise<BranchBundle | null> {
  // מפת קטגוריה→שורש (לסיווג המוצר לקטגוריה עליונה)
  const cats = await searchRead<{ id: number; name: string; parent_id: [number, string] | false }>(
    "product.public.category",
    [],
    ["id", "name", "parent_id"],
    { limit: 400 },
  );
  const parentOf = new Map<number, number | null>();
  const nameOf = new Map<number, string>();
  for (const c of cats) {
    parentOf.set(c.id, c.parent_id ? c.parent_id[0] : null);
    nameOf.set(c.id, c.name);
  }
  const rootSet = new Set(GROCERY_ROOT_IDS);
  const rootOf = (id: number): number | null => {
    let cur: number | null = id;
    const seen = new Set<number>();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      if (rootSet.has(cur)) return cur;
      cur = parentOf.get(cur) ?? null;
    }
    return null;
  };

  const heCats = await searchRead<{ id: number; name: string }>(
    "product.public.category",
    [["id", "in", GROCERY_ROOT_IDS]],
    ["id", "name"],
    { context: { lang: HE } },
  );
  const heCatName = new Map(heCats.map((c) => [c.id, c.name]));

  // מכולת = כל מוצר מפורסם שאינו מנת תפריט (כולל מוצרי מדף ללא קטגוריית מכולת).
  const rows = await searchRead<ProdRow & { public_categ_ids: number[] }>(
    "product.template",
    [
      ["website_published", "=", true],
      ["sale_ok", "=", true],
      ["company_id", "in", [companyId, false]],
      "!",
      ["public_categ_ids", "child_of", MENU_ROOT_IDS],
    ],
    ["id", "name", "list_price", "qty_available", "public_categ_ids", "categ_id", "barcode", "description_sale"],
    { limit: 1500, order: "name asc" },
  );
  if (!rows.length) return null;

  const [pricer, heRows] = await Promise.all([
    buildPricer(pricelistId),
    searchRead<{ id: number; name: string; description_sale: string | false }>(
      "product.template",
      [["id", "in", rows.map((r) => r.id)]],
      ["id", "name", "description_sale"],
      { context: { lang: HE }, limit: rows.length },
    ),
  ]);
  const heMap = new Map(heRows.map((r) => [r.id, { name: r.name, desc: stripHtml(r.description_sale) }]));

  const STORE_ID = "grocery";
  const SHOP_CAT = "shop"; // קטגוריית ברירת מחדל למוצרי מדף ללא קטגוריית מכולת
  const products: Product[] = rows
    .filter((r) => !isTakeAway(r.name))
    .map((r) => {
      const root = (r.public_categ_ids ?? []).map(rootOf).find((x) => x != null) ?? null;
      return {
        id: String(r.id),
        storeId: STORE_ID,
        categoryId: root != null ? String(root) : SHOP_CAT,
        nameHe: heMap.get(r.id)?.name ?? r.name,
        nameEn: r.name,
        descHe: heMap.get(r.id)?.desc || undefined,
        descEn: stripHtml(r.description_sale) || undefined,
        price: pricer(r.id, r.categ_id ? r.categ_id[0] : null, r.list_price ?? 0),
        qtyAvailable: typeof r.qty_available === "number" ? r.qty_available : null,
        isKitchen: false,
        isFeatured: false,
        barcode: r.barcode || undefined,
        image: imageUrl(r.id),
      } satisfies Product;
    });

  // קטגוריות בשימוש (שורשי מכולת + ברירת מחדל "מוצרי חנות"), עם "חנות" בסוף.
  const usedIds = [...new Set(products.map((p) => p.categoryId))];
  const categories: Category[] = usedIds
    .map((id) =>
      id === SHOP_CAT
        ? { id: SHOP_CAT, slug: SHOP_CAT, nameHe: "מוצרי חנות", nameEn: "Shop Items", storeId: STORE_ID }
        : {
            id,
            slug: id,
            nameHe: heCatName.get(Number(id)) ?? nameOf.get(Number(id)) ?? "",
            nameEn: nameOf.get(Number(id)) ?? "",
            storeId: STORE_ID,
          },
    )
    .sort((a, b) => (a.id === SHOP_CAT ? 1 : b.id === SHOP_CAT ? -1 : 0));

  const store: Store = {
    id: STORE_ID,
    slug: STORE_ID,
    nameHe: "מכולת",
    nameEn: "Kosher Store",
    type: "grocery",
    emoji: "",
    order: 99,
  };
  return { store, categories, products };
}

// רשימת מוצרי הסניף (לבחירת קישור באנר). מזהה בסיס (ללא וריאנט).
export interface BranchProduct {
  id: string;
  nameHe: string;
  nameEn: string;
}
export async function getBranchProducts(companyId: number): Promise<BranchProduct[]> {
  const bundles = await getBranchData(companyId);
  const seen = new Set<string>();
  const out: BranchProduct[] = [];
  for (const b of bundles) {
    for (const p of b.products) {
      const base = String(p.id).split("|")[0];
      if (seen.has(base)) continue;
      seen.add(base);
      out.push({ id: base, nameHe: p.nameHe, nameEn: p.nameEn });
    }
  }
  return out.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}

// רשימת חנויות הסניף כפי שמופיעות בחזית (מזהה זהה ל-getBranchData) — קליל, ללא טעינת מוצרים.
// משמש את צד-המנהל לקביעת שם+לוגו לכל חנות.
export interface BranchStore {
  id: string;
  nameHe: string;
  nameEn: string;
  type: "kitchen" | "grocery";
}
export async function getBranchStores(companyId: number): Promise<BranchStore[]> {
  const branch = (await getBranches()).find((b) => b.companyId === companyId);
  if (!branch) return [];
  const stores: BranchStore[] = branch.configs
    .filter((c) => c.type === "kitchen")
    .map((c) => ({ id: String(c.id), nameHe: c.name, nameEn: c.name, type: "kitchen" as const }));
  // חנות המכולת (eCommerce) — מזהה קבוע "grocery", כמו ב-getBranchData
  stores.push({ id: "grocery", nameHe: "מכולת", nameEn: "Kosher Store", type: "grocery" });
  return stores;
}

export async function getBranchData(companyId: number): Promise<BranchBundle[]> {
  const branch = (await getBranches()).find((b) => b.companyId === companyId);
  if (!branch) return [];

  // קטגוריות מכולת (POS) — מוחסרות מחנויות המטבח כדי לא לערבב.
  const groceryCfg = branch.configs.find((c) => c.type === "grocery");
  const shared = groceryCfg ? new Set(await allowedCategs(groceryCfg.id)) : new Set<number>();

  // חנויות מטבח (מסעדה) מ-pos.config בלבד
  const kitchenConfigs = branch.configs.filter((c) => c.type === "kitchen");
  const kitchenBundles = await Promise.all(
    kitchenConfigs.map(async (cfg, idx) => {
      const allowed = await allowedCategs(cfg.id);
      const effective = allowed.filter((id) => !shared.has(id));
      const [categories, products] = await Promise.all([
        loadCategories(effective, String(cfg.id)),
        loadProducts(companyId, cfg, effective),
      ]);
      const store: Store = {
        id: String(cfg.id),
        slug: String(cfg.id),
        nameHe: cfg.name,
        nameEn: cfg.name,
        type: cfg.type,
        emoji: "",
        order: idx,
      };
      return { store, categories, products };
    }),
  );

  // חנות מכולת מבוססת eCommerce (כל קטלוג המצרכים) — מחליפה את מכולת ה-POS
  const pricelistId = branch.configs.find((c) => c.pricelistId)?.pricelistId ?? null;
  const grocery = await getGroceryBundle(companyId, pricelistId);

  return grocery ? [...kitchenBundles, grocery] : kitchenBundles;
}
