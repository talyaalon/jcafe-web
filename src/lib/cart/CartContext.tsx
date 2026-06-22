"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/odoo/types";

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
}

const CartContext = createContext<CartContextValue | null>(null);
// v2 — פריטים מתויגים כעת בסניף (branch). עגלות ישנות (ללא תיוג) נזרקות.
const STORAGE_KEY = "jcafe_cart_v2";

const SCHED_KEY = "jcafe_schedules";
// 2ד: מפתח legacy. כבר לא מקור-אמת לסניף (URL+Cookie הם ה-SSOT) — רק מנקים שארית.
const BRANCH_KEY = "jcafe_branch";

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
  // 2ד: הסניף נקבע מ-URL (Storefront) או Cookie (initialBranch) בלבד — אין יותר
  // מקור localStorage מתחרה, לכן אין צורך ב-flag "מפורש" שהגן מפני דריסה.
  const setBranchCompany = (n: number) => setBranchCompanyState(n);
  const [hydrated, setHydrated] = useState(false);

  // טעינה מ-localStorage אחרי mount (מונע אי-התאמת hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
      const s = localStorage.getItem(SCHED_KEY);
      if (s) setSchedules(JSON.parse(s) as Record<string, string>);
      // 2ד: ניקוי שארית מקור-האמת המתחרה הישן. הסניף מגיע כעת אך ורק מ-URL/Cookie.
      localStorage.removeItem(BRANCH_KEY);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // שמירה בכל שינוי (אחרי הידרציה).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(SCHED_KEY, JSON.stringify(schedules));
      // 2ד: לא כותבים יותר את הסניף ל-localStorage — ה-Cookie (persistent) מחזיק את ההמשכיות.
    } catch {
      /* ignore */
    }
  }, [items, schedules, hydrated]);

  const addItem: CartContextValue["addItem"] = (product, store, qty = 1) => {
    // 2ג-3b fail-closed: אי-אפשר להוסיף לעגלה בלי סניף פעיל. נקרא רק מ-Storefront
    // (שם branchCompany תמיד נקבע מה-URL), לכן ה-guard לעולם לא נורה בפועל.
    if (branchCompany == null) return;
    const branch = branchCompany; // צמצום ל-number עבור CartItem.branch
    setItems((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty, branch } : i,
        );
      return [...prev, { product, qty, store, branch }];
    });
  };

  const inc = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty + 1 } : i)),
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
