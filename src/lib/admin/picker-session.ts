import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// סשן מלקט פר-סניף — עוגייה חתומה (HMAC) נפרדת לכל סניף, כך שהתחברות למלקט של
// סניף אחד לא נותנת גישה לאחר. נפרד לחלוטין מסשן המנהל (jcafe_admin).

const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 יום — טאבלט קבוע בסניף
const secret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-insecure-secret";
const sign = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export const pickerCookieName = (branch: number) => `jcafe_pk_${branch}`;
export const PICKER_MAX_AGE = MAX_AGE_SEC;

export function createPickerToken(branch: number): string {
  const payload = Buffer.from(
    JSON.stringify({ b: branch, exp: Date.now() + MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verify(token: string | undefined, branch: number): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.b === branch && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function hasPickerAccess(branch: number): Promise<boolean> {
  const c = await cookies();
  return verify(c.get(pickerCookieName(branch))?.value, branch);
}
