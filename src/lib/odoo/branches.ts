import "server-only";
import type { Store, Category, Product } from "./types";
import { searchRead } from "./client";
import { buildPricer } from "./pricelist";

// ===== טעינת נתוני סניף גנרית (כל חברה/סניף עם ה-POS שלה) =====
// סניף = res.company; חנות = pos.config של אותה חברה (עם מחירון).
// מוצרים נשאבים לפי available_in_pos + company_id + קטגוריות החנות.

const HE = "he_IL";
const ODOO_BASE = (process.env.ODOO_URL ?? "").replace(/\/$/, "");

// תרגום עברי לקטגוריות מסעדה נפוצות — fallback כש-ODOO לא מתרגם את pos.category.
export const CATEGORY_HE: Record<string, string> = {
  Starters: "מנות ראשונות",
  Appetizers: "מתאבנים",
  "Main Dish": "מנות עיקריות",
  "Main Dishes": "מנות עיקריות",
  "Side Dish": "תוספות",
  "Side Dishes": "תוספות",
  Sides: "תוספות",
  Salads: "סלטים",
  Soup: "מרקים",
  Soups: "מרקים",
  Fish: "דגים",
  Meat: "בשר",
  Beef: "בקר",
  Chicken: "עוף",
  "Meat Topping": "תוספות בשר",
  Pasta: "פסטה",
  Pizza: "פיצה",
  Hamburger: "המבורגר",
  Burgers: "המבורגרים",
  Sandwiches: "כריכים",
  Sandwich: "כריך",
  Bagels: "בייגלים",
  "Bagel Toast": "בייגל טוסט",
  Toasts: "טוסטים",
  Toast: "טוסט",
  Mains: "מנות עיקריות",
  Main: "מנות עיקריות",
  Kids: "ילדים",
  Smoothies: "שייקים",
  Smoothie: "שייק",
  "Shawarma & Grill": "שווארמה וגריל",
  "Mama's Kitchen": "המטבח של אמא",
  "Challah Club": "מועדון חלה",
  "Soft Drink": "משקאות קלים",
  "Soft Drinks": "משקאות קלים",
  "Small Salad": "סלט קטן",
  Breads: "לחמים",
  Bread: "לחם",
  Hummus: "חומוס",
  Breakfast: "ארוחת בוקר",
  Specials: "ספיישלים",
  Special: "ספיישל",
  Thai: "תאילנדי",
  Drinks: "משקאות",
  Beverages: "משקאות",
  Desserts: "קינוחים",
  Dessert: "קינוח",
  "Pastries & Desserts": "מאפים וקינוחים",
  Pastries: "מאפים",
  Bakery: "מאפייה",
  "TKP Bakery": "מאפיית TKP",
  "Shop Items": "מוצרי חנות",
  Fresh: "טרי",
  Others: "אחר",
  Other: "אחר",
};
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

// ===== קאשים (עם תפוגה — שינוי ב-ODOO יתעדכן תוך דקות) =====
const CACHE_TTL_MS = 5 * 60 * 1000;
const allowedCache = new Map<number, { ids: number[]; ts: number }>();

async function allowedCategs(configId: number): Promise<number[]> {
  const c = allowedCache.get(configId);
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.ids;
  const rows = await searchRead<{ iface_available_categ_ids: number[] }>(
    "pos.config",
    [["id", "=", configId]],
    ["iface_available_categ_ids"],
  );
  const ids = rows[0]?.iface_available_categ_ids ?? [];
  allowedCache.set(configId, { ids, ts: Date.now() });
  return ids;
}

// ===== עץ קטגוריות ציבוריות (product.public.category) — נטען פעם וקאש =====
interface PubCatNode {
  name: string;
  parent: number | null;
}
const pubTreeCache: { tree: Map<number, PubCatNode> | null; ts: number } = { tree: null, ts: 0 };
async function loadPublicCatTree(): Promise<Map<number, PubCatNode>> {
  if (pubTreeCache.tree && Date.now() - pubTreeCache.ts < CACHE_TTL_MS) return pubTreeCache.tree;
  const rows = await searchRead<{ id: number; name: string; parent_id: [number, string] | false }>(
    "product.public.category",
    [],
    ["id", "name", "parent_id"],
    { limit: 600 },
  );
  const tree = new Map<number, PubCatNode>();
  for (const r of rows) tree.set(r.id, { name: r.name, parent: r.parent_id ? r.parent_id[0] : null });
  pubTreeCache.tree = tree;
  pubTreeCache.ts = Date.now();
  return tree;
}

// קטגוריית התפריט (ה"סקשן") של מוצר: הצומת שההורה שלו הוא אחד משורשי התפריט.
// למשל "J Cafe Menu / Hummus" → 67 (Hummus). מחזיר null אם אין התאמה.
function menuSectionOf(publicIds: number[], tree: Map<number, PubCatNode>): number | null {
  const roots = new Set(MENU_ROOT_IDS);
  for (const start of publicIds ?? []) {
    let cur: number | null = start;
    const seen = new Set<number>();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      const node = tree.get(cur);
      if (!node) break;
      if (node.parent != null && roots.has(node.parent)) return cur; // צומת ישיר תחת שורש תפריט
      if (roots.has(cur)) break; // הגענו לשורש ללא תת-קטגוריה
      cur = node.parent;
    }
  }
  return null;
}

// בניית קטגוריות תפריט (פילים) משורשי הקטגוריות הציבוריות שבשימוש בפועל.
async function loadMenuCategories(sectionIds: number[], storeId: string): Promise<Category[]> {
  if (!sectionIds.length) return [];
  const [en, he] = await Promise.all([
    searchRead<{ id: number; name: string; sequence: number }>(
      "product.public.category",
      [["id", "in", sectionIds]],
      ["id", "name", "sequence"],
    ),
    searchRead<{ id: number; name: string }>(
      "product.public.category",
      [["id", "in", sectionIds]],
      ["id", "name"],
      { context: { lang: HE } },
    ),
  ]);
  const heMap = new Map(he.map((c) => [c.id, c.name]));
  return en
    .filter((c) => c.name && !isTakeAway(c.name))
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || a.name.localeCompare(b.name))
    .map((c) => {
      const heName = heMap.get(c.id);
      const nameHe =
        heName && heName !== c.name ? heName : (CATEGORY_HE[c.name.trim()] ?? heName ?? c.name);
      return { id: String(c.id), slug: String(c.id), nameHe, nameEn: c.name, storeId };
    });
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
    .map((c) => {
      const heName = heMap.get(c.id);
      // עברית מ-ODOO אם קיים תרגום אמיתי, אחרת מהמפה הידנית, אחרת אנגלית
      const nameHe =
        heName && heName !== c.name ? heName : (CATEGORY_HE[c.name.trim()] ?? heName ?? c.name);
      return { id: String(c.id), slug: String(c.id), nameHe, nameEn: c.name, storeId };
    });
}

interface ProdRow {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  pos_categ_ids: number[];
  public_categ_ids: number[];
  categ_id: [number, string] | false;
  attribute_line_ids: number[];
  is_storable: boolean;
  allow_out_of_stock_order: boolean;
  barcode: string | false;
  default_code: string | false;
  description_sale: string | false;
}

// מוצר מוצג אם: אינו מנוהל-מלאי, או יש מלאי, או "המשך מכירה גם כשאזל" מסומן ב-ODOO.
function inStockOrSellable(r: {
  is_storable: boolean;
  qty_available: number;
  allow_out_of_stock_order: boolean;
}): boolean {
  if (!r.is_storable) return true;
  if ((r.qty_available ?? 0) > 0) return true;
  return !!r.allow_out_of_stock_order;
}

// מצרכים (מכולת): מוצגים רק אם יש כמות ON HAND (qty_available > 0),
// אלא אם סומן "המשך מכירה גם כשאזל" (allow_out_of_stock_order) ב-ODOO.
function hasStock(r: { qty_available: number; allow_out_of_stock_order: boolean }): boolean {
  if (r.allow_out_of_stock_order) return true;
  return (r.qty_available ?? 0) > 0;
}

async function loadProducts(
  companyId: number,
  cfg: BranchConfig,
  effective: number[],
  menuOnly = false,
): Promise<Product[]> {
  if (!effective.length) return [];
  const domain: unknown[] = [
    ["available_in_pos", "=", true],
    ["company_id", "in", [companyId, false]],
    ["pos_categ_ids", "in", effective],
  ];
  // סניפי "קפה בלבד" (ללא חנות POS): מנות מזוהות לפי קטגוריית תפריט ציבורית,
  // ומוצרי מדף (במבה וכו') מסוננים. בסניפים עם חנות POS משתמשים בחיסור
  // קטגוריות החנות (effective) במקום, כי שם המנות אינן ממופות לקטגוריה ציבורית.
  if (menuOnly) {
    domain.push(["public_categ_ids", "child_of", MENU_ROOT_IDS]);
  }
  const [rows, pricer, pubTree] = await Promise.all([
    searchRead<ProdRow>(
      "product.template",
      domain,
      ["id", "name", "list_price", "qty_available", "pos_categ_ids", "public_categ_ids", "categ_id", "attribute_line_ids", "is_storable", "allow_out_of_stock_order", "barcode", "default_code", "description_sale"],
      // הקשר חברה — qty_available (ON HAND) מחושב לפי מלאי הסניף (החברה) הספציפי
      { limit: 500, order: "name asc", context: { allowed_company_ids: [companyId] } },
    ),
    buildPricer(cfg.pricelistId),
    // קטגוריות תפריט נשאבות מהקטגוריה הציבורית (רק במצב menuOnly = קפה ללא חנות POS)
    menuOnly ? loadPublicCatTree() : Promise.resolve(null),
  ]);

  // מטבח — מנות מוכנות לפי הזמנה (מוצגות תמיד); מכולת — לפי ON HAND בלבד
  const filtered = rows.filter(
    (r) => !isTakeAway(r.name) && (cfg.type === "kitchen" ? inStockOrSellable(r) : hasStock(r)),
  );
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
    // menuOnly: קבץ לפי סקשן הקטגוריה הציבורית (J Cafe Menu / Jdeli Menu …);
    // אחרת (סניף POS): לפי קטגוריית ה-POS כמקודם.
    const section = menuOnly && pubTree ? menuSectionOf(r.public_categ_ids, pubTree) : null;
    const firstCat =
      section != null
        ? section
        : ((r.pos_categ_ids ?? []).find((id) => effective.includes(id)) ?? r.pos_categ_ids?.[0]);
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
      hasOptions: (r.attribute_line_ids?.length ?? 0) > 0,
      barcode: r.barcode || undefined,
      reference: r.default_code || undefined,
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
// קטגוריות POS של מוצרי חנות/מדף (לא תפריט): Shop Items / Fresh / Wholesale.
export const SHOP_POS_CATEGORY_IDS = [44, 42, 43];

// סדר קטגוריות מכולת: "מכולת" (Grocery) ראשון, "יודאיקה" אחרון.
const groceryCatRank = (id: string): number => {
  if (id === "28") return -1; // Grocery (מכולת) first
  if (id === "81") return 999; // Jewish Accessories (יודאיקה) last
  if (id === "shop") return 900; // Shop Items fallback near end
  const order = [49, 60, 45, 41, 56, 80];
  const i = order.indexOf(Number(id));
  return i === -1 ? 500 : i;
};

// סדר קטגוריות מטבח: מנות פתיחה ראשונות, שתייה אחרונה, השאר באמצע (סדר ODOO נשמר).
const STARTER_RE = /starter|מנות פתיחה|פתיחה|ראשונות|appetizer/i;
const DRINK_RE = /drink|beverage|soft.?drink|smoothie|coffee|משקא|שתי|שייק|קפה|מיץ|juice/i;
export function orderKitchenCategories(cats: Category[]): Category[] {
  const rank = (c: Category) => {
    const n = `${c.nameEn} ${c.nameHe}`;
    if (STARTER_RE.test(n)) return -1;
    if (DRINK_RE.test(n)) return 1;
    return 0;
  };
  return cats.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}

// חנות מכולת לסניף.
// broad=true (קפה בלבד): כל מוצר מפורסם שאינו תפריט (+ קטגוריית "מוצרי חנות").
// broad=false (סניף עם חנות POS): רק מוצרים בקטגוריות מכולת ציבוריות (לא מנות POS).
export async function getGroceryBundle(
  companyId: number,
  pricelistId: number | null,
  broad = true,
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
      ...(broad
        ? ["!", ["public_categ_ids", "child_of", MENU_ROOT_IDS]]
        : [["public_categ_ids", "child_of", GROCERY_ROOT_IDS]]),
    ],
    ["id", "name", "list_price", "qty_available", "public_categ_ids", "categ_id", "attribute_line_ids", "is_storable", "allow_out_of_stock_order", "barcode", "description_sale"],
    // ON HAND לפי מלאי הסניף (החברה) הספציפי
    { limit: 1500, order: "name asc", context: { allowed_company_ids: [companyId] } },
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
    .filter((r) => !isTakeAway(r.name) && hasStock(r))
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
        // מוצר שמוצג ניתן להזמנה (אם אזל אבל "המשך מכירה" — לא חוסמים)
        qtyAvailable: null,
        isKitchen: false,
        isFeatured: false,
        hasOptions: (r.attribute_line_ids?.length ?? 0) > 0,
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
    .sort((a, b) => groceryCatRank(a.id) - groceryCatRank(b.id));

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
  reference?: string;
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
      out.push({ id: base, nameHe: p.nameHe, nameEn: p.nameEn, reference: p.reference });
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

  // ===== שני מצבי סיווג מטבח↔מכולת (לפי מבנה ה-ODOO של הסניף) =====
  // posMode (יש חנות POS, למשל פוקט/סמוי): המנות הן POS-only ללא קטגוריה
  //   ציבורית → מסננים לפי קטגוריות POS (מחסרים את קטגוריות החנות + מדף).
  // !posMode (קפה בלבד, למשל בנגקוק): המנות ממופות לקטגוריית תפריט ציבורית →
  //   מסננים לפי whitelist של שורשי תפריט, והמכולת היא קטלוג ה-eCommerce.
  const groceryCfg = branch.configs.find((c) => c.type === "grocery");
  const posMode = !!groceryCfg;
  const shopSet = posMode
    ? new Set<number>([...(await allowedCategs(groceryCfg!.id)), ...SHOP_POS_CATEGORY_IDS])
    : new Set<number>();

  const kitchenConfigs = branch.configs.filter((c) => c.type === "kitchen");
  const kitchenBundles = await Promise.all(
    kitchenConfigs.map(async (cfg, idx) => {
      const allowed = await allowedCategs(cfg.id);
      const effective = posMode ? allowed.filter((id) => !shopSet.has(id)) : allowed;
      const products = await loadProducts(companyId, cfg, effective, !posMode);
      // קפה ללא חנות POS: הקטגוריות הן סקשני התפריט הציבוריים שבשימוש בפועל
      // (J Cafe Menu / Jdeli Menu …). סניף POS: קטגוריות ה-POS כמקודם.
      const categories = posMode
        ? await loadCategories(effective, String(cfg.id))
        : await loadMenuCategories(
            [...new Set(products.map((p) => Number(p.categoryId)).filter((n) => Number.isFinite(n) && n > 0))],
            String(cfg.id),
          );
      const store: Store = {
        id: String(cfg.id),
        slug: String(cfg.id),
        nameHe: cfg.name,
        nameEn: cfg.name,
        type: cfg.type,
        emoji: "",
        order: idx,
      };
      // posMode: סדר לפי היוריסטיקה (פתיחה ראשון, שתייה אחרון).
      // !posMode: כבר מסודר לפי sequence של הקטגוריה הציבורית ב-ODOO.
      return { store, categories: posMode ? orderKitchenCategories(categories) : categories, products };
    }),
  );

  const pricelistId = branch.configs.find((c) => c.pricelistId)?.pricelistId ?? null;
  const grocery = await getGroceryBundle(companyId, pricelistId, !posMode);

  return grocery ? [...kitchenBundles, grocery] : kitchenBundles;
}
