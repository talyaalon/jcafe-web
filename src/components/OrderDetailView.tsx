"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { COMPANY_SLUG } from "@/lib/branch-slugs";
import { useReorder } from "@/lib/cart/use-reorder";
import { PrintReceiptButton } from "./staff/PrintReceiptButton";
import { IconCart } from "./Icons";

interface AcctItem {
  name: string;
  qty: number;
  price?: number;
  storeName: string;
  storeId: string;
  templateId?: number;
}
interface AcctOrder {
  order_name: string | null;
  created_at: string;
  company: number | null;
  method: string | null;
  total: number;
  delivery_fee?: number | null;
  address?: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  scheduled_for?: string | null;
  notes?: string | null;
  items: AcctItem[];
}

export function OrderDetailView({
  locale,
  dict,
  name,
}: {
  locale: Locale;
  dict: Dictionary;
  name: string;
}) {
  const a = dict.account;
  const he = locale === "he";
  const reorder = useReorder(locale);
  const [order, setOrder] = useState<AcctOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      const res = await fetch(`/api/account/orders?name=${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (alive) {
        setOrder(((j.orders as AcctOrder[]) ?? [])[0] ?? null);
        setLoading(false);
      }
    })().catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [name]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const methodLabel = (m: string | null) =>
    m === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup";

  const back = (
    <Link
      href={`/${locale}/account?tab=orders`}
      className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-wine mb-4"
    >
      {he ? "→ חזרה להזמנות" : "← Back to orders"}
    </Link>
  );

  if (loading) {
    return <div className="max-w-2xl mx-auto w-full px-4 py-16 text-center text-ink/40">…</div>;
  }
  if (!order) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-12">
        {back}
        <p className="text-center text-ink/50">{he ? "הזמנה לא נמצאה" : "Order not found"}</p>
      </div>
    );
  }

  const branchName =
    order.company != null
      ? (COMPANY_SLUG[order.company] ?? "").replace(/^\w/, (c) => c.toUpperCase())
      : "";
  const subtotal = order.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);
  const receipt = {
    order_name: order.order_name,
    created_at: order.created_at,
    customer_name: order.customer_name,
    phone: order.phone,
    email: order.email,
    method: order.method,
    address: order.address,
    scheduled_for: order.scheduled_for,
    notes: order.notes,
    total: order.total,
    delivery_fee: order.delivery_fee,
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      storeName: i.storeName,
    })),
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
      {back}

      <div className="border border-line rounded-2xl bg-white overflow-hidden">
        <div className="bg-wine text-white px-5 py-4 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-brand text-xl font-extrabold">{order.order_name || "—"}</h1>
            <p className="text-white/70 text-sm mt-0.5">{fmtDate(order.created_at)}</p>
          </div>
          <div className="text-end text-sm">
            <div>{methodLabel(order.method)}</div>
            {branchName && <div className="text-white/70">{branchName}</div>}
          </div>
        </div>

        <div className="p-5">
          {order.method === "delivery" && order.address && (
            <p className="text-sm text-ink/70 mb-3">
              {he ? "כתובת" : "Address"}: <b className="text-ink">{order.address}</b>
            </p>
          )}

          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="text-ink font-medium">{it.name}</span>{" "}
                  <span className="text-ink/45">×{it.qty}</span>
                  <span className="block text-[11px] text-ink/45">{it.storeName}</span>
                </span>
                <span className="font-semibold text-ink whitespace-nowrap">
                  {formatTHB((it.price ?? 0) * it.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="text-sm mt-4 space-y-1 max-w-xs ms-auto">
            <div className="flex justify-between text-ink/70">
              <span>{he ? "סכום ביניים" : "Subtotal"}</span>
              <span>{formatTHB(subtotal)}</span>
            </div>
            {!!order.delivery_fee && (
              <div className="flex justify-between text-ink/70">
                <span>{he ? "דמי משלוח" : "Delivery"}</span>
                <span>{formatTHB(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-wine text-base pt-1 border-t border-line">
              <span>{a.total}</span>
              <span>{formatTHB(order.total)}</span>
            </div>
          </div>

          {order.notes && (
            <p className="text-[12px] text-ink/55 mt-3 bg-soft rounded-lg p-2.5">📝 {order.notes}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => reorder(order)}
              className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 bg-wine text-white font-bold rounded-xl py-3 hover:bg-wine-hover"
            >
              <IconCart className="w-5 h-5" />
              {he ? "הזמנה חוזרת" : "Reorder"}
            </button>
            <PrintReceiptButton
              order={receipt}
              branchName={branchName || "J Cafe"}
              logoUrl={null}
              locale={locale}
              className="inline-flex items-center justify-center gap-2 border-2 border-wine text-wine font-bold rounded-xl px-4 py-3 text-sm hover:bg-wine hover:text-white transition"
            />
            <PrintReceiptButton
              order={receipt}
              branchName={branchName || "J Cafe"}
              logoUrl={null}
              locale={locale}
              docType="invoice"
              className="inline-flex items-center justify-center gap-2 border-2 border-line text-ink/70 font-bold rounded-xl px-4 py-3 text-sm hover:border-wine hover:text-wine transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
