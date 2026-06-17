import type { OdooAdapter } from "./types";
import { mockAdapter } from "./mock-adapter";
import { odooApiAdapter } from "./api-adapter";

// בורר שכבת נתונים: ODOO_MODE=api → ODOO אמיתי, אחרת mock.
export const odoo: OdooAdapter =
  process.env.ODOO_MODE === "api" ? odooApiAdapter : mockAdapter;

export type { OdooAdapter };
