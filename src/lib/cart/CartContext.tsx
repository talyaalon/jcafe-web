"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/odoo/types";
import {
  cartStorageKey,
  schedStorageKey,
  groupCartByBranch,
  LEGACY_CART_KEY,
  LEGACY_SCHED_KEY,
  LEGACY_BRANCH_KEY,
} from "./cart-storage";

export interface CartStoreRef {
  id: string;
  nameHe: string;
  nameEn: string;
  emoji: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  store: CartStoreRef;
  /** הסניף (company id) שממנו נוסף הפריט — קובע את חברת ההזמנה ב-ODOO */
  branch: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, store: CartStoreRef, qty?: number) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  removeStore: (storeId: string) => void;
  clear: () => void;
  /** תזמון הזמנה לכל חנות: storeId → datetime-local string */
  schedules: Record<string, string>;
  setSchedule: (storeId: string, value: string) => void;
  clearSchedule: (storeId: string) => void;
  /** הסניף (company id) שממנו מזמינים — נקבע לפי הסטורפרונט שנצפה.
   *  null = אין סניף פעיל (משתמש בעמוד auth ללא Cookie). אין יותר fallback שקט ל-14. */
  branchCompany: number | null;
  setBranchCompany: (n: number) => void;
  /** הזמנה חוזרת: מחליף את הסל בפריטים נתונים בסניף נתון (עגלה חדשה). */
  replaceCart: (branch: number, items: CartItem[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// תקרת כמות פר-מוצר: מצרך מנוהל-מלאי → עד הכמות החיה (qtyAvailable). מטבח/"המשך מכירה
// כשאזל" → ללא הגבלה. ה-snapshot הוא רמז-UX; האכיפה האמיתית היא בדיקת המלאי ב-checkout (שלב A).
function maxQtyFor(p: Product): number {
  return p.allowOutOfStock || p.qtyAvailable == null ? Infinity : p.qtyAvailable;
}
// בידוד סל פר-סניף: כל סניף קורא/כותב למפתח jcafe_cart_v2:<branch> שלו בלבד
// (ראה cart-storage.ts). הסל הפעיל נגזר מ-branchCompany האמין.

export function CartProvider({
  children,
  initialBranch,
}: {
  children: ReactNode;
  /** סבב 2א: זרע סניף מ-SSR (Cookie). רדום כרגע — לא מחווט עד 2ב.
   *  כשאינו מסופק, ההתנהגות זהה לחלוטין להיום (ברירת מחדל 14 + localStorage). */
  initialBranch?: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  // 2ג-3b: אין יותר ברירת-מחדל שקטה ל-14. בלי סניף מפורש (URL/Cookie) → null.
  const [branchCompany, setBranchCompanyState] = useState<number | null>(initialBranch ?? null);
  // 2ד: הסניף נקבע מ-URL (Storefront) או Cookie (initialBranch) בלבד.
  const setBranchCompany = (n: number) => setBranchCompanyState(n);
  const [hydrated, setHydrated] = useState(false);
  // הסניף שאליו שייך מערך ה-items הנוכחי — קובע לאיזה מפתח לשמור (מונע דליפה בין סניפים).
  const loadedBranchRef = useRef<number | null>(initialBranch ?? null);
  // מיגרציה חד-פעמית של הסל הגלובלי הישן → סלים פר-סניף.
  const migratedRef = useRef(false);

  // טוען את הסל של הסניף הפעיל בכל החלפת סניף (+ מיגרציה חד-פעמית מהסל הגלובלי הישן).
  useEffect(() => {
    // מיגרציה חד-פעמית: הסל הגלובלי הישן → סלים פר-סניף (lossless, לפי item.branch).
    if (!migratedRef.current) {
      migratedRef.current = true;
      try {
        const legacy = localStorage.getItem(LEGACY_CART_KEY);
        if (legacy) {
          for (const [b, group] of groupCartByBranch(JSON.parse(legacy) as CartItem[])) {
            // לא לדרוס סל-סניף קיים — רק לזרוע מהישן.
            if (!localStorage.getItem(cartStorageKey(b))) {
              localStorage.setItem(cartStorageKey(b), JSON.stringify(group));
            }
          }
          localStorage.removeItem(LEGACY_CART_KEY);
        }
        // תזמונים גלובליים ישנים — storeId="grocery" מתנגש בין סניפים, והם ארעיים → ניקוי נקי.
        localStorage.removeItem(LEGACY_SCHED_KEY);
        localStorage.removeItem(LEGACY_BRANCH_KEY); // שארית 2ד
      } catch {
        /* ignore */
      }
    }

    // טעינת הסל של הסניף הפעיל (ריק אם אין סניף / אין סל לסניף הזה).
    loadedBranchRef.current = branchCompany;
    if (branchCompany == null) {
      setItems([]);
      setSchedules({});
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(cartStorageKey(branchCompany));
      setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
      const s = localStorage.getItem(schedStorageKey(branchCompany));
      setSchedules(s ? (JSON.parse(s) as Record<string, string>) : {});
    } catch {
      setItems([]);
      setSchedules({});
    }
    setHydrated(true);
  }, [branchCompany]);

  // שמירה לסל של הסניף שאליו ה-items שייכים (loadedBranchRef) — לא לסניף שאליו אולי
  // עוברים כרגע. כך מעבר בין סניפים לא מערבב ולא מוחק.
  useEffect(() => {
    if (!hydrated) return;
    const b = loadedBranchRef.current;
    if (b == null) return; // אין סניף פעיל → אין מה לשמור
    try {
      localStorage.setItem(cartStorageKey(b), JSON.stringify(items));
      localStorage.setItem(schedStorageKey(b), JSON.stringify(schedules));
    } catch {
      /* ignore */
    }
  }, [items, schedules, hydrated]);

  const addItem: CartContextValue["addItem"] = (product, store, qty = 1) => {
    // 2ג-3b fail-closed: אי-אפשר להוסיף לעגלה בלי סניף פעיל. נקרא רק מ-Storefront
    // (שם branchCompany תמיד נקבע מה-URL), לכן ה-guard לעולם לא נורה בפועל.
    if (branchCompany == null) return;
    const branch = branchCompany; // צמצום ל-number עבור CartItem.branch
    const max = maxQtyFor(product);
    setItems((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: Math.min(max, i.qty + qty), branch } : i,
        );
      return [...prev, { product, qty: Math.min(max, qty), store, branch }];
    });
  };

  const inc = (id: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === id ? { ...i, qty: Math.min(maxQtyFor(i.product), i.qty + 1) } : i,
      ),
    );

  const dec = (id: string) =>
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== id) return [i];
        const q = i.qty - 1;
        return q <= 0 ? [] : [{ ...i, qty: q }];
      }),
    );

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.product.id !== id));

  const removeStore = (storeId: string) =>
    setItems((prev) => prev.filter((i) => i.store.id !== storeId));

  const clear = () => {
    setItems([]);
    setSchedules({});
  };

  // הזמנה חוזרת: כותב את הפריטים לסל הסניף ב-localStorage ואז עובר אליו, כך שאפקט
  // טעינת הסל לא ידרוס אותם (הוא טוען מ-localStorage = אותם פריטים).
  const replaceCart: CartContextValue["replaceCart"] = (branch, newItems) => {
    try {
      localStorage.setItem(cartStorageKey(branch), JSON.stringify(newItems));
      localStorage.setItem(schedStorageKey(branch), JSON.stringify({}));
    } catch {
      /* ignore */
    }
    if (branch === branchCompany) {
      loadedBranchRef.current = branch;
      setItems(newItems);
      setSchedules({});
    } else {
      setBranchCompany(branch);
    }
  };

  const setSchedule = (storeId: string, value: string) =>
    setSchedules((prev) => ({ ...prev, [storeId]: value }));
  const clearSchedule = (storeId: string) =>
    setSchedules((prev) => {
      const next = { ...prev };
      delete next[storeId];
      return next;
    });

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        addItem,
        inc,
        dec,
        remove,
        removeStore,
        clear,
        schedules,
        setSchedule,
        clearSchedule,
        branchCompany,
        setBranchCompany,
        replaceCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
