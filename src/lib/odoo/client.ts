import "server-only";

// ===== ODOO External API client (JSON-RPC) =====
// מתקשר מול endpoint /jsonrpc הסטנדרטי של ODOO.
// אימות: service "common" / method "authenticate" → מחזיר uid.
// קריאות: service "object" / method "execute_kw".

interface OdooConfig {
  url: string;
  db: string;
  username: string;
  apiKey: string;
}

function getConfig(): OdooConfig {
  const url = process.env.ODOO_URL?.replace(/\/$/, "");
  const db = process.env.ODOO_DB;
  const username = process.env.ODOO_USERNAME;
  const apiKey = process.env.ODOO_API_KEY;
  if (!url || !db || !username || !apiKey) {
    throw new Error(
      "ODOO config חסר — ודא ש-ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY מוגדרים ב-.env.local",
    );
  }
  return { url, db, username, apiKey };
}

async function jsonRpc<T>(
  url: string,
  service: string,
  method: string,
  args: unknown[],
): Promise<T> {
  const res = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Math.floor(Math.random() * 1e9),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ODOO HTTP ${res.status}`);
  const json = (await res.json()) as {
    result?: T;
    error?: { message?: string; data?: { message?: string } };
  };
  if (json.error) {
    throw new Error(json.error.data?.message ?? json.error.message ?? "ODOO RPC error");
  }
  return json.result as T;
}

let uidCache: number | null = null;

export async function authenticate(): Promise<number> {
  if (uidCache) return uidCache;
  const { url, db, username, apiKey } = getConfig();
  const uid = await jsonRpc<number | false>(url, "common", "authenticate", [
    db,
    username,
    apiKey,
    {},
  ]);
  if (!uid) throw new Error("ODOO authentication failed — בדוק DB / username / API key");
  uidCache = uid;
  return uid;
}

export async function odooVersion(): Promise<unknown> {
  const { url } = getConfig();
  return jsonRpc(url, "common", "version", []);
}

/** קריאה גנרית ל-execute_kw */
export async function executeKw<T = unknown>(
  model: string,
  method: string,
  args: unknown[] = [],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const { url, db, apiKey } = getConfig();
  const uid = await authenticate();
  return jsonRpc<T>(url, "object", "execute_kw", [
    db,
    uid,
    apiKey,
    model,
    method,
    args,
    kwargs,
  ]);
}

/** search_read מקוצר (תומך ב-context, למשל {lang:"he_IL"}) */
export function searchRead<T = Record<string, unknown>>(
  model: string,
  domain: unknown[] = [],
  fields: string[] = [],
  opts: {
    limit?: number;
    offset?: number;
    order?: string;
    context?: Record<string, unknown>;
  } = {},
): Promise<T[]> {
  return executeKw<T[]>(model, "search_read", [domain, fields], opts);
}
