import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

// ===== סשן מנהל חתום (HMAC) =====
// במקום קוקי "1" שניתן לזייף — טוקן חתום עם תפוגה, שלא ניתן לזייף ללא הסוד.
export const ADMIN_COOKIE = "jcafe_admin";
const MAX_AGE_SEC = 60 * 60 * 8; // 8 שעות

function secret(): string {
  // עדיף ADMIN_SESSION_SECRET ייעודי; נופל לסיסמת המנהל (שינוי סיסמה ⇒ ניתוק).
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-insecure-secret";
}

const sign = (payload: string): string =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

export function createAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_SEC * 1000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

function verify(token: string | undefined): boolean {
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
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verify(c.get(ADMIN_COOKIE)?.value);
}

export const SESSION_MAX_AGE = MAX_AGE_SEC;
