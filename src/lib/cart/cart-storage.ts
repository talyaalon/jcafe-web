// בידוד סל פר-סניף — מפתחות אחסון ולוגיקת מיגרציה. מודול טהור (ללא I/O), נבדק ב-node:test.
// "כל סניף עולם נפרד": כל סניף קורא/כותב לסל משלו בלבד; הסל הפעיל נגזר מ-branchCompany
// האמין (URL/Cookie מסבב 2), לא ממקור מתחרה.

// המפתחות הגלובליים הישנים (סל אחד משותף) — מקור באג ה"סל המעורב". מנוקים במיגרציה.
export const LEGACY_CART_KEY = "jcafe_cart_v2";
export const LEGACY_SCHED_KEY = "jcafe_schedules";
export const LEGACY_BRANCH_KEY = "jcafe_branch";

/** מפתח הסל של סניף מסוים: jcafe_cart_v2:<branch> */
export function cartStorageKey(branch: number): string {
  return `${LEGACY_CART_KEY}:${branch}`;
}

/** מפתח התזמונים של סניף מסוים (storeId="grocery" מתנגש בין סניפים → חייב הפרדה פר-סניף) */
export function schedStorageKey(branch: number): string {
  return `${LEGACY_SCHED_KEY}:${branch}`;
}

/**
 * קיבוץ פריטי הסל הגלובלי הישן לפי תג הסניף שלהם (item.branch).
 * הפריטים כבר מתויגים נכון (addItem מתייג ב-branchCompany), לכן הפיצול lossless.
 * פריט ללא תג סניף תקין (null/undefined/לא-שלם) מושמט — אי-אפשר לשייכו לסניף.
 */
export function groupCartByBranch<T extends { branch?: number | null }>(
  items: T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const it of items) {
    const b = it.branch;
    if (typeof b !== "number" || !Number.isInteger(b)) continue;
    const arr = map.get(b) ?? [];
    arr.push(it);
    map.set(b, arr);
  }
  return map;
}
