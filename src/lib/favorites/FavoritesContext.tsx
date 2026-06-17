"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "@/lib/odoo/types";

interface FavoritesValue {
  favorites: Product[];
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (product: Product) => void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);
const KEY = "jcafe_favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setFavorites(JSON.parse(raw) as Product[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(favorites));
    } catch {
      /* ignore */
    }
  }, [favorites, hydrated]);

  const isFavorite = (id: string) => favorites.some((p) => p.id === id);

  const toggle = (product: Product) =>
    setFavorites((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product],
    );

  return (
    <FavoritesContext.Provider value={{ favorites, count: favorites.length, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
