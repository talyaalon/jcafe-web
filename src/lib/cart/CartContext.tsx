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
  /** הסניף (company id) שממנו מזמינים — נקבע לפי הסטורפרונט שנצפה */
  branchCompany: number;
  setBranchCompany: (n: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "jcafe_cart";

const SCHED_KEY = "jcafe_schedules";
const BRANCH_KEY = "jcafe_branch";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [branchCompany, setBranchCompanyState] = useState(14);
  const branchExplicit = useRef(false);
  // הסטורפרונט קובע את הסניף במפורש — מנצח את הערך הנטען מ-localStorage.
  const setBranchCompany = (n: number) => {
    branchExplicit.current = true;
    setBranchCompanyState(n);
  };
  const [hydrated, setHydrated] = useState(false);

  // טעינה מ-localStorage אחרי mount (מונע אי-התאמת hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
      const s = localStorage.getItem(SCHED_KEY);
      if (s) setSchedules(JSON.parse(s) as Record<string, string>);
      const b = localStorage.getItem(BRANCH_KEY);
      // לא לדרוס אם סטורפרונט כבר קבע את הסניף במפורש (effect של child רץ קודם).
      if (b && !branchExplicit.current) setBranchCompanyState(Number(b) || 14);
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
      localStorage.setItem(BRANCH_KEY, String(branchCompany));
    } catch {
      /* ignore */
    }
  }, [items, schedules, branchCompany, hydrated]);

  const addItem: CartContextValue["addItem"] = (product, store, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.product.id === product.id);
      if (ex)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty } : i,
        );
      return [...prev, { product, qty, store }];
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
