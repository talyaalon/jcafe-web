"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useCart, type CartStoreRef } from "@/lib/cart/CartContext";
import { CheckoutFooter } from "./CheckoutFooter";
import { CartThumb } from "./CartThumb";
import { useStoreStatus, useStoreHours } from "@/lib/store-status";
import { isOpenAt, minDateTime } from "@/lib/schedule";
import { quoteDelivery, DEFAULT_DELIVERY, type DeliverySettings } from "@/lib/delivery";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Method = "delivery" | "pickup";
type Step = "contact" | "review" | "done";
type Payment = "card" | "qr" | "cod";

const PHUKET_CITIES = ["Phuket Town", "Rawai", "Patong", "Kata", "Karon", "Chalong", "Kathu", "Thalang"];

export function CheckoutForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, subtotal, remove, clear } = useCart();
  const { user } = useAuth();
  const statuses = useStoreStatus();
  const storeHours = useStoreHours();
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY);
  useEffect(() => {
    fetch("/api/delivery/settings")
      .then((r) => r.json())
      .then((d) => d?.settings && setDeliverySettings(d.settings))
      .catch(() => {});
  }, []);
  const [step, setStep] = useState<Step>("contact");
  const [method, setMethod] = useState<Method>("delivery");
  const [payment, setPayment] = useState<Payment>("card");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    addr1: "",
    addr2: "",
    postcode: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const stripe = useStripe();
  const elements = useElements();

  const he = locale === "he";
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const storeName = (s: CartStoreRef) => (he ? s.nameHe : s.nameEn);
  const pName = (p: { nameHe: string; nameEn: string }) => (he ? p.nameHe : p.nameEn);
  const t = dict.checkout;

  // חישוב דמי משלוח לפי מרחק (עיר → קו אווירי מהסניף → מדרגות)
  const quote =
    method === "delivery" && form.city ? quoteDelivery(deliverySettings, form.city, subtotal) : null;
  const deliveryFee = quote && !quote.outOfRange ? quote.fee : 0;
  const total = subtotal + deliveryFee;
  const deliveryBlocked = method === "delivery" && !!quote?.outOfRange;

  // חנויות סגורות שיש להן פריטים בעגלה → חוסם הזמנה רגילה, מחייב תזמון.
  const closedStoreIds = [...new Set(items.map((i) => i.store.id))].filter(
    (id) => statuses[id] === false,
  );
  const hasClosed = closedStoreIds.length > 0;

  function onScheduleChange(v: string) {
    setScheduledAt(v);
    if (!v) return setScheduleError("");
    const allOpen = closedStoreIds.every((id) => isOpenAt(storeHours[id] ?? [], v));
    setScheduleError(
      allOpen
        ? ""
        : he
          ? "בתאריך/שעה שבחרת אנחנו סגורים. אנא בחר/י תאריך או שעה אחרים."
          : "We're closed at the selected date/time. Please choose another date or time.",
    );
  }

  function continueGuest() {
    const e: Record<string, boolean> = {};
    if (!form.name.trim()) e.name = true;
    if (!form.email.trim()) e.email = true;
    if (!form.phone.trim()) e.phone = true;
    setErrors(e);
    if (!Object.keys(e).length) setStep("review");
  }

  async function placeOrder() {
    const e: Record<string, boolean> = {};
    if (method === "delivery") {
      if (!form.city.trim()) e.city = true;
      if (!form.addr1.trim()) e.addr1 = true;
      if (!form.postcode.trim()) e.postcode = true;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setApiError(null);
    setSubmitting(true);
    try {
      // ===== תשלום Stripe (כרטיס) לפני יצירת ההזמנה =====
      let paymentRef = "";
      if (payment === "card") {
        if (!stripe || !elements) throw new Error("Payment is not ready, please retry");
        const piRes = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total }),
        });
        const piData = await piRes.json();
        if (!piRes.ok || !piData.ok) throw new Error(piData.error || "Payment init failed");
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Please enter card details");
        const { error, paymentIntent } = await stripe.confirmCardPayment(piData.clientSecret, {
          payment_method: { card },
        });
        if (error) throw new Error(error.message || "Payment failed");
        paymentRef = `Paid via Stripe: ${paymentIntent?.id ?? ""}`;
      } else if (payment === "cod") {
        paymentRef = "Cash on Delivery";
      } else if (payment === "qr") {
        paymentRef = "QR PromptPay (pending)";
      }

      const payload = {
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          street: method === "delivery" ? [form.addr1, form.addr2].filter(Boolean).join(" ") : undefined,
          city: method === "delivery" ? form.city : undefined,
          zip: method === "delivery" ? form.postcode : undefined,
        },
        items: items.map((i) => ({
          id: i.product.id,
          qty: i.qty,
          price: i.product.price,
          name: i.product.nameEn || i.product.nameHe,
          storeName: i.store.nameEn || i.store.nameHe,
          storeId: i.store.id,
        })),
        method,
        branch: "Phuket",
        scheduledFor: scheduledAt || undefined,
        notes:
          [
            form.notes,
            paymentRef,
            scheduledAt ? `Scheduled for: ${scheduledAt}` : "",
            method === "delivery" && deliveryFee ? `Delivery fee: ${deliveryFee} THB` : "",
          ]
            .filter(Boolean)
            .join(" | ") || undefined,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Order failed");
      setOrderNo(data.orderNo);
      // מייל אישור הזמנה (אם מוגדר Resend) — fire-and-forget
      if (form.email) {
        fetch("/api/notify/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: form.email, orderNo: data.orderNo, total, name: form.name }),
        }).catch(() => {});
      }
      // שמירת ההזמנה בהיסטוריית המשתמש (אם מחובר)
      if (user) {
        await supabaseBrowser.from("orders").insert({
          user_id: user.id,
          odoo_name: data.orderNo,
          total,
          item_count: items.reduce((s, i) => s + i.qty, 0),
          method,
        });
      }
      clear();
      setStep("done");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ===== עגלה ריקה =====
  if (items.length === 0 && step !== "done") {
    return (
      <div className="flex flex-col min-h-full">
        <CheckoutTopBar locale={locale} dict={dict} />
        <div className="flex-1 grid place-items-center p-6">
          <div className="text-center">
            <div className="text-5xl text-gold">🛒</div>
            <p className="text-ink/60 mt-3">{t.empty}</p>
            <p className="text-ink/50 text-sm">{t.emptyHint}</p>
            <Link
              href={`/${locale}`}
              className="inline-block mt-5 bg-wine text-white font-bold rounded-xl px-6 py-3 hover:bg-wine-hover"
            >
              {t.back}
            </Link>
          </div>
        </div>
        <CheckoutFooter dict={dict} />
      </div>
    );
  }

  // ===== מסך אישור =====
  if (step === "done") {
    const addr = [form.addr1, form.addr2, form.city, form.postcode].filter(Boolean).join(", ");
    return (
      <div className="flex flex-col min-h-full">
        <CheckoutTopBar locale={locale} dict={dict} />
        <div className="flex-1 grid place-items-start justify-center p-6">
          <div className="bg-white border border-line rounded-2xl p-8 max-w-md w-full text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-brand-green text-white text-3xl grid place-items-center mx-auto mb-3">
              ✓
            </div>
            <h1 className="text-xl font-extrabold text-ink">{t.placed}</h1>
            <p className="text-ink/55 text-sm mt-2">
              {t.orderNo}: <b className="text-wine">{orderNo}</b>
            </p>
            <p className="text-ink/55 text-sm">{t.placedSub}</p>
            {method === "delivery" && (
              <div className="text-start bg-soft rounded-xl p-4 mt-5">
                <div className="font-bold text-wine text-sm">
                  {t.deliveringTo} {form.name}
                </div>
                <div className="text-ink/60 text-[13px] mt-1">{addr}</div>
              </div>
            )}
            <div className="mt-6">
              <Link
                href={`/${locale}`}
                className="block bg-wine text-white font-bold rounded-xl py-3 hover:bg-wine-hover"
              >
                {t.continueShopping}
              </Link>
            </div>
          </div>
        </div>
        <CheckoutFooter dict={dict} />
      </div>
    );
  }

  const inputCls = (k: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition ${
      errors[k] ? "border-red-500" : "border-line focus:border-wine"
    }`;

  return (
    <div className="flex flex-col min-h-full">
      <CheckoutTopBar locale={locale} dict={dict} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-4 sm:px-7 py-6 max-w-6xl mx-auto w-full">
        {/* ===== left: steps ===== */}
        <div className="space-y-4">
          {step === "contact" ? (
            <section className="bg-white border border-line rounded-2xl p-6 max-w-lg">
              <h1 className="text-xl font-extrabold text-ink">{t.guestTitle}</h1>
              <p className="text-ink/55 text-sm mt-1 mb-5">{t.guestSub}</p>

              <Label>{t.recipientName}*</Label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls("name")} />
              {errors.name && <Err>{t.required}</Err>}

              <Label className="mt-4">{t.email}*</Label>
              <input value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls("email")} />
              {errors.email && <Err>{t.required}</Err>}

              <Label className="mt-4">{t.phone}*</Label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls("phone")} />
              {errors.phone && <Err>{t.required}</Err>}

              <button
                onClick={continueGuest}
                className="w-full bg-wine text-white font-bold rounded-xl py-3 mt-6 hover:bg-wine-hover"
              >
                {t.continueAsGuest}
              </button>
              <p className="text-center text-sm text-ink/60 mt-4">{t.haveAccount}</p>
              <Link
                href={`/${locale}/login`}
                className="block text-center border-2 border-gold text-wine font-bold rounded-xl py-2.5 mt-2"
              >
                {t.login}
              </Link>
            </section>
          ) : (
            <>
              {/* method toggle */}
              <div className="flex gap-3">
                {(["delivery", "pickup"] as Method[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition ${
                      method === m
                        ? "border-wine bg-wine/5 text-wine"
                        : "border-line bg-white text-ink/60"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 grid place-items-center ${method === m ? "border-wine" : "border-line"}`}
                    >
                      {method === m && <span className="w-2 h-2 rounded-full bg-wine" />}
                    </span>
                    {m === "delivery" ? `🚚 ${t.delivery}` : `🏬 ${t.pickup}`}
                  </button>
                ))}
              </div>

              {/* address / pickup */}
              {method === "delivery" ? (
                <section className="bg-white border border-line rounded-2xl p-5">
                  <h2 className="font-bold text-ink">{t.addressTitle}</h2>
                  <p className="text-ink/55 text-xs mb-3">{t.addressSub}</p>

                  <Label>{t.city}*</Label>
                  <select value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls("city")}>
                    <option value="">—</option>
                    {PHUKET_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.city && <Err>{t.required}</Err>}

                  <Label className="mt-3">{t.addrLine1}*</Label>
                  <input value={form.addr1} onChange={(e) => set("addr1", e.target.value)} className={inputCls("addr1")} />
                  {errors.addr1 && <Err>{t.required}</Err>}

                  <Label className="mt-3">{t.addrLine2}</Label>
                  <input value={form.addr2} onChange={(e) => set("addr2", e.target.value)} className={inputCls("addr2")} />

                  <Label className="mt-3">{t.postcode}*</Label>
                  <input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className={inputCls("postcode")} />
                  {errors.postcode && <Err>{t.required}</Err>}
                </section>
              ) : (
                <section className="bg-white border border-line rounded-2xl p-5">
                  <h2 className="font-bold text-ink mb-2">{t.pickupFrom}</h2>
                  <a className="text-wine text-sm underline cursor-pointer">
                    3rd Floor, Mille Malle, Phuket
                  </a>
                </section>
              )}

              {/* payment */}
              <section className="bg-white border border-line rounded-2xl p-5">
                <h2 className="font-bold text-ink mb-3">{t.paymentMethod}</h2>
                {(
                  [
                    ["card", `💳 ${t.card}`],
                    ["qr", `📱 ${t.qr}`],
                    ["cod", `💵 ${t.cod}`],
                  ] as [Payment, string][]
                ).map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() => setPayment(p)}
                    className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-sm mb-2 transition ${
                      payment === p ? "border-wine bg-wine/5" : "border-line"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 grid place-items-center ${payment === p ? "border-wine" : "border-line"}`}
                    >
                      {payment === p && <span className="w-2 h-2 rounded-full bg-wine" />}
                    </span>
                    {label}
                  </button>
                ))}

                {payment === "card" && (
                  <div className="mt-2 border border-line rounded-xl px-3 py-3.5">
                    <CardElement
                      options={{
                        style: {
                          base: {
                            fontSize: "14px",
                            color: "#2a2a2a",
                            "::placeholder": { color: "#9ca3af" },
                          },
                        },
                      }}
                    />
                    <p className="text-[11px] text-ink/45 mt-2">
                      {locale === "he"
                        ? "כרטיס בדיקה: 4242 4242 4242 4242 · 12/34 · 123"
                        : "Test card: 4242 4242 4242 4242 · 12/34 · 123"}
                    </p>
                  </div>
                )}
              </section>

              {/* notes */}
              <section className="bg-white border border-line rounded-2xl p-5">
                <h2 className="font-bold text-ink mb-2">{t.notes}</h2>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder={t.notesPlaceholder}
                  rows={2}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
                />
              </section>

              <p className="text-[12px] text-ink/55">{t.terms}</p>
              {apiError && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {apiError}
                </p>
              )}
              {deliveryBlocked && (
                <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {he
                    ? "הכתובת מחוץ לטווח המשלוח. בחר/י איסוף עצמי או עיר קרובה יותר."
                    : "Address is out of delivery range. Choose pickup or a closer city."}
                </p>
              )}

              {hasClosed ? (
                <>
                  <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {he
                      ? "יש בעגלה מוצרים מחנות שסגורה כעת — ניתן רק לבצע הזמנה מתוזמנת."
                      : "Cart has items from a store that's closed now — only a scheduled order is available."}
                  </div>
                  {/* Place order — חסום */}
                  <button
                    disabled
                    className="w-full bg-wine/40 text-white font-extrabold rounded-xl py-3.5 cursor-not-allowed"
                  >
                    {t.placeOrder}
                  </button>
                  {/* Scheduled order — בהיר */}
                  {!scheduleMode ? (
                    <button
                      onClick={() => setScheduleMode(true)}
                      className="w-full border-2 border-wine text-wine font-bold rounded-xl py-3 hover:bg-wine/5"
                    >
                      🗓 {he ? "הזמנה מתוזמנת" : "Scheduled order"}
                    </button>
                  ) : (
                    <div className="border border-line rounded-xl p-3 space-y-2">
                      <label className="block text-sm text-ink/70">
                        {he ? "בחר/י תאריך ושעה (בשעות הפתיחה)" : "Choose date & time (within opening hours)"}
                      </label>
                      <input
                        type="datetime-local"
                        min={minDateTime()}
                        value={scheduledAt}
                        onChange={(e) => onScheduleChange(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none ${scheduleError ? "border-red-500" : "border-line focus:border-wine"}`}
                      />
                      {scheduleError && <p className="text-red-600 text-xs">{scheduleError}</p>}
                      <button
                        onClick={placeOrder}
                        disabled={submitting || !scheduledAt || !!scheduleError || deliveryBlocked}
                        className="w-full bg-wine text-white font-extrabold rounded-xl py-3 hover:bg-wine-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "…" : he ? "אשר הזמנה מתוזמנת" : "Confirm scheduled order"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={submitting || deliveryBlocked}
                  className="w-full bg-wine text-white font-extrabold rounded-xl py-3.5 hover:bg-wine-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "…" : t.placeOrder}
                </button>
              )}
            </>
          )}
        </div>

        {/* ===== right: order summary ===== */}
        <aside className="border border-line rounded-2xl bg-white h-fit lg:sticky lg:top-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h2 className="font-extrabold text-ink">
              {t.summary} — {items.reduce((s, i) => s + i.qty, 0)} {dict.cart.items}
            </h2>
          </div>
          <div className="max-h-[46vh] overflow-y-auto divide-y divide-line">
            {items.map(({ product, qty, store }) => {
              const closed = statuses[store.id] === false;
              return (
                <div key={product.id} className="px-4 py-3 text-[12.5px]">
                  <div className="flex items-center gap-3">
                    <CartThumb src={product.image} alt={pName(product)} />
                    <div className="flex-1 min-w-0">
                      <div className="leading-tight line-clamp-2">{pName(product)}</div>
                      <div className="text-ink/45">
                        {storeName(store)}
                        {closed && (
                          <span className="text-red-500 font-bold"> · {he ? "סגור כעת" : "Closed"}</span>
                        )}{" "}
                        · ×{qty}
                      </div>
                    </div>
                    <span className="font-bold">{formatTHB(product.price * qty)}</span>
                    <button onClick={() => remove(product.id)} className="text-ink/40 hover:text-red-500">
                      ✕
                    </button>
                  </div>
                  {closed && (
                    <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                      {he
                        ? "החנות סגורה כעת — הסירו את הפריט (✕) או בצעו הזמנה מתוזמנת למטה."
                        : "Store closed — remove the item (✕) or schedule the order below."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-line text-[13px] bg-soft">
            <div className="flex justify-between py-0.5">
              <span>{t.subtotal}</span>
              <span>{formatTHB(subtotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-ink/55">
              <span>{t.deliveryFee}</span>
              <span>
                {method !== "delivery"
                  ? he
                    ? "איסוף עצמי"
                    : "Pickup"
                  : !form.city
                    ? t.enterPostcode
                    : quote?.outOfRange
                      ? he
                        ? "מחוץ לטווח"
                        : "Out of range"
                      : quote?.free
                        ? he
                          ? "חינם"
                          : "Free"
                        : `${formatTHB(deliveryFee)} · ~${quote ? quote.km.toFixed(1) : ""}km`}
              </span>
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-line font-extrabold text-wine text-[15px]">
              <span>{t.total}</span>
              <span>{formatTHB(total)}</span>
            </div>
          </div>
        </aside>
      </div>

      <CheckoutFooter dict={dict} />
    </div>
  );
}

function CheckoutTopBar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white border-b border-line">
      <Link href={`/${locale}`} className="leading-none">
        <span className="block text-2xl font-extrabold text-ink">{dict.brand.name}</span>
        <span className="block text-[8px] tracking-[3px] text-wine font-bold">{dict.brand.tagline}</span>
      </Link>
      <Link href={`/${locale}/login`} className="text-sm flex items-center gap-1.5">
        👤 {dict.header.login}
      </Link>
    </header>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-ink/80 mb-1 ${className}`}>{children}</label>;
}
function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-red-500 text-xs mt-1">{children}</p>;
}
