import "server-only";
import type { Store, Category, Product } from "./types";
import { searchRead } from "./client";

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
const pricelistCache = new Map<number, Map<number, number>>();

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

async function pricelistMap(pricelistId: number | null): Promise<Map<number, number>> {
  if (!pricelistId) return new Map();
  const cached = pricelistCache.get(pricelistId);
  if (cached) return cached;
  const items = await searchRead<{ product_tmpl_id: [number, string] | false; fixed_price: number }>(
    "product.pricelist.item",
    [
      ["pricelist_id", "=", pricelistId],
      ["applied_on", "=", "1_product"],
      ["compute_price", "=", "fixed"],
    ],
    ["product_tmpl_id", "fixed_price"],
    { limit: 5000 },
  );
  const map = new Map<number, number>();
  for (const it of items) if (it.product_tmpl_id) map.set(it.product_tmpl_id[0], it.fixed_price);
  pricelistCache.set(pricelistId, map);
  return map;
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
  barcode: string | false;
  description_sale: string | false;
}

async function loadProducts(
  companyId: number,
  cfg: BranchConfig,
  effective: number[],
): Promise<Product[]> {
  if (!effective.length) return [];
  const [rows, prices] = await Promise.all([
    searchRead<ProdRow>(
      "product.template",
      [
        ["available_in_pos", "=", true],
        ["company_id", "in", [companyId, false]],
        ["pos_categ_ids", "in", effective],
      ],
      ["id", "name", "list_price", "qty_available", "pos_categ_ids", "barcode", "description_sale"],
      { limit: 200, order: "name asc" },
    ),
    pricelistMap(cfg.pricelistId),
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
      price: prices.get(r.id) ?? r.list_price ?? 0,
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

export async function getBranchData(companyId: number): Promise<BranchBundle[]> {
  const branch = (await getBranches()).find((b) => b.companyId === companyId);
  if (!branch) return [];

  const grocery = branch.configs.find((c) => c.type === "grocery");
  const shared = grocery ? new Set(await allowedCategs(grocery.id)) : new Set<number>();

  return Promise.all(
    branch.configs.map(async (cfg, idx) => {
      const allowed = await allowedCategs(cfg.id);
      const effective = cfg.type === "grocery" ? allowed : allowed.filter((id) => !shared.has(id));
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
}
