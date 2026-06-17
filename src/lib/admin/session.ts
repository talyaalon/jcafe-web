import "server-only";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "jcafe_admin";

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === "1";
}
