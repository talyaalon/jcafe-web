// כתובת תמונת מוצר ב-ODOO (תקין רק בצד שרת — ODOO_URL אינו נחשף ללקוח).
const ODOO_BASE = (process.env.ODOO_URL ?? "").replace(/\/$/, "");

export function productImageUrl(
  templateId?: number | string | null,
  size: 128 | 256 | 512 = 128,
): string | undefined {
  if (!templateId || !ODOO_BASE) return undefined;
  const id = String(templateId).split("|")[0];
  return `${ODOO_BASE}/web/image/product.template/${id}/image_${size}`;
}
