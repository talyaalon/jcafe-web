"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useCart, type CartStoreRef, type CartItem } from "@/lib/cart/CartContext";
import { cartBackupKey } from "@/lib/cart/cart-storage";
import { branchHref } from "@/lib/branch-slugs";
import { CheckoutFooter } from "./CheckoutFooter";
import { CartThumb } from "./CartThumb";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { IconDelivery, IconPickup, IconAccount, IconCart } from "./Icons";
import { FavoritesMenu } from "./FavoritesMenu";
import { LangMenu } from "./LangMenu";
import { useStoreStatus, useStoreHours } from "@/lib/store-status";
import type { Shortage } from "@/lib/odoo/stock-check";
import { isOpenAt, minDateTime } from "@/lib/schedule";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getBranchProfile, defaultAddress, withBranchProfile } from "@/lib/account/profile";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Method = "delivery" | "pickup";
type Step = "contact" | "review" | "done";
type Payment = "card" | "qr" | "cod";

interface BranchInfo {
  slug: string;
  nameHe: string | null;
  nameEn: string | null;
  taglineHe: string | null;
  taglineEn: string | null;
  logoUrl: string | null;
  pickupAddress: string | null;
}


export function CheckoutForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, subtotal, remove, clear, branchCompany, replaceCart } = useCart();
  const { user } = useAuth();
  // סניף ההזמנה נגזר מהפריטים בעגלה (לא מקובע לפוקט) — לחישוב המשלוח והסטטוס הנכון
  const cartBranch = items.find((i) => i.branch)?.branch ?? branchCompany;
  const statuses = useStoreStatus(cartBranch);
  // מפתח idempotency יציב לניסיון ההזמנה הנוכחי — מונע כפל הזמנה/חיוב ב-retry
  const idemRef = useRef<string>("");
  const storeHours = useStoreHours(cartBranch);
  const [step, setStep] = useState<Step>("contact");
  const [method, setMethod] = useState<Method>("delivery");
  const [payment, setPayment] = useState<Payment>("card");
  // שיטות תשלום פעילות לסניף (נטען מצד-שרת לפי הסניף שבעגלה)
  const [pay, setPay] = useState({ card: true, qr: true, cod: true });
  // מידע תצוגה לסניף שבעגלה (שם, לוגו, slug, כתובת איסוף) — להדר ולמסך האיסוף
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    addr1: "",
    addr2: "",
    postcode: "",
    deliveryNotes: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // שלב A — פריטים שאזלו (מ-409 OUT_OF_STOCK): מציג אזהרה ומאפשר הסר-והמשך / בטל.
  const [stockIssue, setStockIssue] = useState<{ shortages: Shortage[]; refunded?: boolean } | null>(
    null,
  );
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

  // משתמש מחובר — מילוי שם/אימייל/טלפון מהפרופיל פעם אחת, כדי שלא יראה את בורר האורח
  // ולא ייווצר לופ של "אורח/התחברות" אחרי שכבר התחבר. דפוס React לעדכון state כשתלות
  // משתנה (בזמן רינדור, עם state-שומר) — לא ב-effect, כדי למנוע רינדור-מדורג.
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (user && prefilledFor !== user.id) {
    setPrefilledFor(user.id);
    const prof = getBranchProfile(user.user_metadata, cartBranch);
    const def = defaultAddress(prof);
    setForm((f) => ({
      ...f,
      name:
        f.name ||
        (user.user_metadata?.name as string | undefined) ||
        user.email?.split("@")[0] ||
        "",
      email: f.email || user.email || "",
      phone: f.phone || prof.phone || (user.user_metadata?.phone as string | undefined) || "",
      addr1: f.addr1 || def?.addr1 || "",
      addr2: f.addr2 || def?.addr2 || "",
      city: f.city || def?.city || "",
      postcode: f.postcode || def?.postcode || "",
    }));
    // משתמש מחובר מדלג על בורר האורח — ישר לעמוד השילוח/תשלום
    setStep((s) => (s === "contact" ? "review" : s));
  }

  // דמי משלוח לפי הכתובת שנבחרה — מחושב בשרת (Geocoding + מרחק מהסניף).
  const [deliveryQuote, setDeliveryQuote] = useState<{ fee: number; blocked: boolean } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  useEffect(() => {
    if (method !== "delivery" || form.addr1.trim().length < 6) {
      setDeliveryQuote(null);
      return;
    }
    setQuoteLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/delivery/quote?branch=${cartBranch}&address=${encodeURIComponent(
            form.addr1,
          )}&subtotal=${subtotal}`,
        );
        const d = (await r.json()) as { fee?: number; blocked?: boolean };
        setDeliveryQuote({ fee: Number(d.fee) || 0, blocked: !!d.blocked });
      } catch {
        setDeliveryQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [method, form.addr1, cartBranch, subtotal]);

  // טעינת שיטות התשלום הפעילות לסניף
  useEffect(() => {
    let alive = true;
    fetch(`/api/payment/settings?branch=${cartBranch}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setPay({ card: d.card !== false, qr: d.qr !== false, cod: d.cod !== false });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [cartBranch]);
  // טעינת מידע הסניף (שם/לוגו/slug/כתובת איסוף)
  useEffect(() => {
    let alive = true;
    fetch(`/api/branch/info?company=${cartBranch}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setBranchInfo(d as BranchInfo);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [cartBranch]);
  // אם השיטה הנבחרת כבויה — מעבר לראשונה הפעילה
  useEffect(() => {
    if (!pay[payment]) {
      const first = (["card", "qr", "cod"] as Payment[]).find((k) => pay[k]);
      if (first) setPayment(first);
    }
  }, [pay, payment]);

  const deliveryFee = method === "delivery" ? (deliveryQuote?.fee ?? 0) : 0;
  // חוסם הזמנת משלוח עד שיש הצעת מחיר תקפה (כתובת בטווח)
  const deliveryBlocked =
    method === "delivery" && (deliveryQuote === null || deliveryQuote.blocked);
  const total = subtotal + deliveryFee;

  // חברת ההזמנה נגזרת מהפריטים עצמם (לא מהסניף הגלובלי) — מונע ערבוב סניפים ב-ODOO.
  const itemBranches = [...new Set(items.map((i) => i.branch).filter((b): b is number => !!b))];
  const mixedBranches = itemBranches.length > 1;
  const orderCompany = itemBranches[0] ?? branchCompany;

  // חנויות סגורות שיש להן פריטים בעגלה → חוסם הזמנה רגילה, מחייב תזמון.
  const closedStoreIds = [...new Set(items.map((i) => i.store.id))].filter(
    (id) => statuses[id] === false,
  );
  const hasClosed = closedStoreIds.length > 0;

  // קיבוץ פריטי הסיכום לפי חנות (כמו בעגלת הקנייה)
  const summaryGroups = [...new Set(items.map((i) => i.store.id))].map((id) => ({
    store: items.find((i) => i.store.id === id)!.store,
    storeItems: items.filter((i) => i.store.id === id),
    closed: statuses[id] === false,
  }));

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
    if (mixedBranches) {
      setApiError(
        he
          ? "העגלה מכילה מוצרים מכמה סניפים. ניתן להזמין מסניף אחד בכל פעם — הסר/י מוצרים מהסניף השני."
          : "Your cart has products from multiple branches. Please order from one branch at a time.",
      );
      return;
    }
    const e: Record<string, boolean> = {};
    if (!form.phone.trim()) e.phone = true;
    if (method === "delivery") {
      if (!form.addr1.trim()) e.addr1 = true;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    setApiError(null);
    setSubmitting(true);
    try {
      // מפתח יציב לכל ניסיונות ההזמנה (כולל retry אחרי שגיאת רשת)
      if (!idemRef.current) idemRef.current = crypto.randomUUID();
      const idempotencyKey = idemRef.current;
      // ===== תשלום Stripe (כרטיס) לפני יצירת ההזמנה =====
      let paymentRef = "";
      let paymentIntentId = "";
      if (payment === "card") {
        if (!stripe || !elements) throw new Error("Payment is not ready, please retry");
        const piRes = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // הסכום מחושב בשרת מהפריטים + Pricelist הסניף; deliveryFee נוסף עליו
          body: JSON.stringify({
            // branch פר-פריט — מאפשר לשרת לגזור ולאמת את החברה מהעגלה בלבד
            items: items.map((i) => ({
              id: i.product.id,
              qty: i.qty,
              price: i.product.price,
              branch: i.branch,
            })),
            companyId: orderCompany,
            method,
            city: method === "delivery" ? form.city : undefined,
            address: method === "delivery" ? form.addr1 : undefined,
            idempotencyKey,
          }),
        });
        const piData = await piRes.json();
        // שלב A — מוצר אזל (לפני חיוב): הצג אזהרה, אל תחייב, תן ללקוח להחליט.
        if (piRes.status === 409 && piData.error === "OUT_OF_STOCK") {
          setStockIssue({ shortages: piData.shortages ?? [], refunded: piData.refunded });
          return;
        }
        if (!piRes.ok || !piData.ok) throw new Error(piData.error || "Payment init failed");
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Please enter card details");
        const { error, paymentIntent } = await stripe.confirmCardPayment(piData.clientSecret, {
          payment_method: { card },
        });
        if (error) throw new Error(error.message || "Payment failed");
        paymentIntentId = paymentIntent?.id ?? "";
        paymentRef = `Paid via Stripe: ${paymentIntentId}`;
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
          // branch פר-פריט — מקור הגזירה והאכיפה של חברת ההזמנה בשרת
          branch: i.branch,
          barcode: i.product.barcode,
          discount: i.product.discountPercent || 0,
        })),
        method,
        payment,
        paymentIntentId: paymentIntentId || undefined,
        idempotencyKey,
        companyId: orderCompany,
        scheduledFor: scheduledAt || undefined,
        notes:
          [
            form.notes,
            method === "delivery" && form.deliveryNotes ? `משלוח: ${form.deliveryNotes}` : "",
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
      // שלב A — מוצר אזל ב-race (אחרי חיוב): refunded=true → התשלום הוחזר; הצג אזהרה.
      if (res.status === 409 && data.error === "OUT_OF_STOCK") {
        setStockIssue({ shortages: data.shortages ?? [], refunded: data.refunded });
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error || "Order failed");
      setOrderNo(data.orderNo);
      // מייל אישור הזמנה (אם מוגדר Resend) — fire-and-forget
      if (form.email) {
        fetch("/api/notify/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: form.email,
            orderNo: data.orderNo,
            total,
            name: form.name,
            phone: form.phone,
            address:
              method === "delivery" ? [form.addr1, form.addr2].filter(Boolean).join(", ") : undefined,
            method,
            deliveryFee,
            scheduledFor: scheduledAt || undefined,
            notes:
              [form.notes, method === "delivery" && form.deliveryNotes ? `משלוח: ${form.deliveryNotes}` : ""]
                .filter(Boolean)
                .join(" · ") || undefined,
            branchName: dict.brand.name,
            locale,
            items: items.map((i) => ({
              name: he ? i.product.nameHe : i.product.nameEn,
              qty: i.qty,
              price: i.product.price,
              storeName: he ? i.store.nameHe : i.store.nameEn,
            })),
          }),
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
        // שמירת טלפון/כתובת לפרופיל הסניף — כדי שיושלמו אוטומטית בפעם הבאה (best-effort)
        if (cartBranch != null) {
          try {
            // קוראים metadata טרי מהשרת (לא מ-user שעלול להיות לא-מעודכן) — כדי לא
            // "להחיות" כתובת שהמשתמש מחק במכשיר/לשונית אחרת בין הטעינה לתשלום.
            const { data: fresh } = await supabaseBrowser.auth.getUser();
            const meta0 = (fresh.user?.user_metadata ?? user.user_metadata) as
              | Record<string, unknown>
              | undefined;
            const prof = getBranchProfile(meta0, cartBranch);
            const addresses = [...(prof.addresses ?? [])];
            if (method === "delivery" && form.addr1.trim()) {
              const exists = addresses.some((x) => x.addr1.trim() === form.addr1.trim());
              if (!exists) {
                addresses.push({
                  id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
                  addr1: form.addr1.trim(),
                  addr2: form.addr2.trim() || undefined,
                  city: form.city.trim() || undefined,
                  postcode: form.postcode.trim() || undefined,
                  isDefault: addresses.length === 0,
                });
              }
            }
            const meta = withBranchProfile(meta0, cartBranch, {
              phone: form.phone.trim() || prof.phone,
              addresses,
            });
            await supabaseBrowser.auth.updateUser({ data: meta });
          } catch {
            /* ignore */
          }
        }
      }
      clear();
      // הזמנה חוזרת: אם גובה סל קודם של הסניף — מחזירים אותו לסל אחרי התשלום
      if (cartBranch != null) {
        try {
          const bk = localStorage.getItem(cartBackupKey(cartBranch));
          if (bk) {
            const restored = JSON.parse(bk) as CartItem[];
            localStorage.removeItem(cartBackupKey(cartBranch));
            if (restored.length) replaceCart(cartBranch, restored);
          }
        } catch {
          /* ignore */
        }
      }
      setStep("done");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // שלב A — הסרת הפריטים שאזלו מהעגלה, כדי שהלקוח ימשיך עם השאר.
  function removeShortages(shortages: Shortage[]) {
    const ids = new Set(shortages.map((s) => String(s.templateId)));
    items
      .filter((i) => ids.has(String(i.product.id).split("|")[0]))
      .forEach((i) => remove(i.product.id));
    setStockIssue(null);
  }

  // ===== עגלה ריקה =====
  if (items.length === 0 && step !== "done") {
    return (
      <div className="flex flex-col min-h-full">
        <CheckoutTopBar locale={locale} dict={dict} branch={branchInfo} />
        <div className="flex-1 grid place-items-center p-6">
          <div className="text-center">
            <div className="text-5xl text-gold">🛒</div>
            <p className="text-ink/60 mt-3">{t.empty}</p>
            <p className="text-ink/50 text-sm">{t.emptyHint}</p>
            <Link
              href={branchHref(locale, branchCompany)}
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
        <CheckoutTopBar locale={locale} dict={dict} branch={branchInfo} />
        <div className="flex-1 grid place-items-start justify-center p-6">
          <div className="bg-white border border-line rounded-2xl p-8 max-w-md w-full text-center mt-6">
            <div className="w-16 h-16 rounded-full bg-brand-green text-white text-3xl grid place-items-center mx-auto mb-3">
              ✓
            </div>
            <h1 className="font-brand text-xl font-extrabold text-ink">{t.placed}</h1>
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
                href={branchHref(locale, branchCompany)}
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
      <CheckoutTopBar locale={locale} dict={dict} branch={branchInfo} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-4 sm:px-7 py-6 max-w-6xl mx-auto w-full">
        {/* ===== left: steps ===== */}
        <div className="space-y-4">
          {step === "contact" ? (
            <section className="bg-white border border-line rounded-2xl p-6 max-w-lg">
              <h1 className="font-brand text-xl font-extrabold text-ink">
                {user ? (he ? "פרטי קשר" : "Contact details") : t.guestTitle}
              </h1>
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
                {user ? (he ? "המשך" : "Continue") : t.continueAsGuest}
              </button>
              {/* בורר אורח/התחברות — רק אם לא מחובר. משתמש מחובר ממשיך ישירות. */}
              {!user && (
                <>
                  <p className="text-center text-sm text-ink/60 mt-4">{t.haveAccount}</p>
                  <Link
                    href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout`)}`}
                    className="block text-center border-2 border-gold text-wine font-bold rounded-xl py-2.5 mt-2"
                  >
                    {t.login}
                  </Link>
                </>
              )}
            </section>
          ) : (
            <>
              {/* פרטי קשר למשתמש מחובר — שם/אימייל מהפרופיל + טלפון (להזמנה/משלוח) */}
              {user && (
                <section className="bg-white border border-line rounded-2xl p-5">
                  <h2 className="font-bold text-ink">{he ? "פרטי קשר" : "Contact details"}</h2>
                  <p className="text-ink/55 text-xs mb-3">
                    {he ? "מזמין/ה" : "Ordering as"}: <b className="text-ink/80">{form.name}</b>
                    {form.email ? ` · ${form.email}` : ""}
                  </p>
                  <Label>{t.phone}*</Label>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    inputMode="tel"
                    className={inputCls("phone")}
                  />
                  {errors.phone && <Err>{t.required}</Err>}
                </section>
              )}

              {/* method toggle */}
              <div className="flex gap-3">
                {(["delivery", "pickup"] as Method[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 text-base font-bold transition ${
                      method === m
                        ? "border-wine bg-wine/5 text-wine"
                        : "border-line bg-white text-ink/70 hover:border-wine/40"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border-2 grid place-items-center flex-none ${method === m ? "border-wine" : "border-line"}`}
                    >
                      {method === m && <span className="w-2.5 h-2.5 rounded-full bg-wine" />}
                    </span>
                    {m === "delivery" ? (
                      <IconDelivery className="w-6 h-6 flex-none" />
                    ) : (
                      <IconPickup className="w-6 h-6 flex-none" />
                    )}
                    <span>{m === "delivery" ? t.delivery : t.pickup}</span>
                  </button>
                ))}
              </div>

              {/* address / pickup */}
              {method === "delivery" ? (
                <section className="bg-white border border-line rounded-2xl p-5">
                  <h2 className="font-bold text-ink">{t.addressTitle}</h2>
                  <p className="text-ink/55 text-xs mb-3">{t.addressSub}</p>

                  <Label>{he ? "כתובת מלאה" : "Full address"}*</Label>
                  <AddressAutocomplete
                    value={form.addr1}
                    onChange={(v) => set("addr1", v)}
                    placeholder={he ? "התחילי להקליד כתובת…" : "Start typing an address…"}
                    className={inputCls("addr1")}
                  />
                  {errors.addr1 && <Err>{t.required}</Err>}

                  <Label className="mt-3">{he ? "דירה / קומה / הערות (אופציונלי)" : t.addrLine2}</Label>
                  <input value={form.addr2} onChange={(e) => set("addr2", e.target.value)} className={inputCls("addr2")} />

                  {/* סטטוס דמי משלוח לפי הכתובת */}
                  {form.addr1.trim().length >= 6 && (
                    <div className="mt-3 text-sm">
                      {quoteLoading ? (
                        <span className="text-ink/50">
                          {he ? "מחשב דמי משלוח…" : "Calculating delivery…"}
                        </span>
                      ) : deliveryQuote?.blocked ? (
                        <span className="text-red-600 font-semibold">
                          {he
                            ? "הכתובת מחוץ לטווח המשלוח של הסניף."
                            : "Address is outside the branch's delivery range."}
                        </span>
                      ) : deliveryQuote ? (
                        <span className="text-brand-green font-semibold">
                          {he ? "דמי משלוח" : "Delivery"}:{" "}
                          {deliveryQuote.fee ? formatTHB(deliveryQuote.fee) : he ? "חינם" : "Free"}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* הערות למשלוח — רק במשלוח, בתוך פרטי המשלוח מתחת לכתובת */}
                  <Label className="mt-4">{he ? "הערות למשלוח (אופציונלי)" : "Delivery notes (optional)"}</Label>
                  <textarea
                    value={form.deliveryNotes}
                    onChange={(e) => set("deliveryNotes", e.target.value)}
                    rows={2}
                    placeholder={
                      he ? "למשל: קומה 3, להתקשר בהגעה…" : "e.g. 3rd floor, call on arrival…"
                    }
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
                  />
                </section>
              ) : (
                <section className="bg-white border border-line rounded-2xl p-5">
                  <h2 className="font-bold text-ink mb-1">
                    {he ? "איסוף עצמי מ־" : "Pickup from "}
                    {(he ? branchInfo?.nameHe : branchInfo?.nameEn) || dict.brand.name}
                  </h2>
                  {branchInfo?.pickupAddress ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branchInfo.pickupAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-wine text-sm underline"
                    >
                      📍 {branchInfo.pickupAddress}
                    </a>
                  ) : (
                    <p className="text-ink/50 text-sm">
                      {he
                        ? "כתובת האיסוף תוגדר ע״י הסניף בהגדרות המשלוחים."
                        : "Pickup address is set by the branch in delivery settings."}
                    </p>
                  )}
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
                )
                  .filter(([p]) => pay[p])
                  .map(([p, label]) => (
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

              {/* order notes — הערות כלליות להזמנה (תמיד) */}
              <section className="bg-white border border-line rounded-2xl p-5">
                <h2 className="font-bold text-ink mb-2">{he ? "הערות להזמנה" : "Order notes"}</h2>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder={he ? "הערות כלליות להזמנה (אופציונלי)" : "General notes for your order (optional)"}
                  rows={2}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
                />
              </section>

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
            {summaryGroups.map(({ store, storeItems, closed }) => (
              <div key={store.id}>
                {/* כותרת חנות — בצבע המותג הסגול */}
                <div className="px-4 py-2 bg-soft flex items-center gap-2 text-[13px] font-extrabold text-wine">
                  <span>{storeName(store)}</span>
                  {closed && (
                    <span className="text-red-500 font-bold">· {he ? "סגור כעת" : "Closed"}</span>
                  )}
                </div>
                {storeItems.map(({ product, qty }) => (
                  <div key={product.id} className="px-4 py-2.5 text-[12.5px]">
                    <div className="flex items-center gap-3">
                      <CartThumb src={product.image} alt={pName(product)} />
                      <div className="flex-1 min-w-0">
                        <div className="leading-tight line-clamp-2">
                          {pName(product)}
                          {product.discountPercent ? (
                            <span className="ms-1.5 inline-block align-middle bg-red-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5">
                              -{product.discountPercent}%
                            </span>
                          ) : null}
                        </div>
                        <div className="text-ink/45">×{qty}</div>
                      </div>
                      <span className="font-bold flex-none">{formatTHB(product.price * qty)}</span>
                      <button
                        onClick={() => remove(product.id)}
                        className="text-ink/40 hover:text-red-500 flex-none"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {closed && (
                  <div className="mx-4 mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-[11px] text-red-700">
                    {he
                      ? "החנות סגורה כעת — הסירו את הפריטים (✕) או בצעו הזמנה מתוזמנת למטה."
                      : "Store closed — remove the items (✕) or schedule the order below."}
                  </div>
                )}
              </div>
            ))}
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
                  : form.addr1.trim().length < 6
                    ? he
                      ? "הזיני כתובת"
                      : "Enter address"
                    : quoteLoading
                      ? "…"
                      : deliveryBlocked
                        ? he
                          ? "מחוץ לאזור"
                          : "Out of area"
                        : deliveryFee === 0
                        ? he
                          ? "חינם"
                          : "Free"
                        : formatTHB(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t border-line font-extrabold text-wine text-[15px]">
              <span>{t.total}</span>
              <span>{formatTHB(total)}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== פעולות הזמנה — מתחת לסיכום העגלה ===== */}
      {step !== "contact" && (
        <div className="px-4 sm:px-7 pb-8 max-w-6xl mx-auto w-full space-y-3">
          <p className="text-[12px] text-ink/55">{t.terms}</p>
          {apiError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}
          {deliveryBlocked && (
            <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {he
                ? "האזור שנבחר אינו באזורי המשלוח של הסניף. בחר/י איסוף עצמי או אזור אחר."
                : "The selected area is not in the branch's delivery zones. Choose pickup or another area."}
            </p>
          )}

          {mixedBranches && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {he
                ? "העגלה מכילה מוצרים מכמה סניפים. ניתן להזמין מסניף אחד בכל פעם — הסר/י מוצרים מהסניף השני."
                : "Your cart has products from multiple branches. Please order from one branch at a time."}
            </div>
          )}

          {hasClosed && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {he
                ? "יש בעגלה מוצרים מחנות שסגורה כעת — ניתן לבצע הזמנה מתוזמנת בלבד."
                : "Cart has items from a store that's closed now — only a scheduled order is available."}
            </div>
          )}

          {/* Place order — חסום כשחנות סגורה */}
          <button
            onClick={placeOrder}
            disabled={hasClosed || submitting || deliveryBlocked || mixedBranches}
            className={`w-full font-extrabold rounded-xl py-3.5 ${
              hasClosed
                ? "bg-wine/40 text-white cursor-not-allowed"
                : "bg-wine text-white hover:bg-wine-hover disabled:opacity-60 disabled:cursor-not-allowed"
            }`}
          >
            {submitting && !scheduleMode ? "…" : t.placeOrder}
          </button>

          {/* Scheduled order — תמיד זמין, מתחת לכפתור ההזמנה */}
          {!scheduleMode ? (
            <button
              type="button"
              onClick={() => setScheduleMode(true)}
              className="w-full border-2 border-wine text-wine font-bold rounded-xl py-3 hover:bg-wine/5"
            >
              🗓 {he ? "הזמנה מתוזמנת" : "Scheduled order"}
            </button>
          ) : (
            <div className="border-2 border-wine/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-wine">
                  🗓 {he ? "הזמנה מתוזמנת" : "Scheduled order"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleMode(false);
                    setScheduledAt("");
                    setScheduleError("");
                  }}
                  className="text-ink/40 hover:text-ink text-sm"
                >
                  ✕
                </button>
              </div>
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
                disabled={submitting || !scheduledAt || !!scheduleError || deliveryBlocked || mixedBranches}
                className="w-full bg-wine text-white font-extrabold rounded-xl py-3 hover:bg-wine-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "…" : he ? "אשר הזמנה מתוזמנת" : "Confirm scheduled order"}
              </button>
            </div>
          )}
        </div>
      )}

      {stockIssue && (
        <div className="fixed inset-0 z-[100] bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="font-extrabold text-lg text-ink mb-2">
              {he ? "מוצרים אזלו מהמלאי" : "Out of stock"}
            </h3>
            <p className="text-sm text-ink/70 mb-3">
              {he
                ? "הפריטים הבאים אזלו ולא ניתן להזמינם כעת:"
                : "These items just sold out and can't be ordered now:"}
            </p>
            <ul className="text-sm space-y-1 mb-3">
              {stockIssue.shortages.map((s) => (
                <li key={s.templateId} className="flex justify-between gap-2 border-b border-line py-1">
                  <span className="truncate">{s.name}</span>
                  <span className="text-ink/50 flex-none">
                    {s.available > 0 ? (he ? `נשארו ${s.available}` : `${s.available} left`) : he ? "אזל" : "out"}
                  </span>
                </li>
              ))}
            </ul>
            {stockIssue.refunded && (
              <p className="text-sm text-brand-green font-semibold mb-3">
                {he ? "התשלום שלך הוחזר במלואו." : "Your payment was fully refunded."}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => removeShortages(stockIssue.shortages)}
                className="flex-1 bg-wine text-white font-bold rounded-lg py-2.5 hover:bg-wine-hover"
              >
                {he ? "הסר מהעגלה והמשך" : "Remove & continue"}
              </button>
              <button
                onClick={() => setStockIssue(null)}
                className="px-4 border border-line rounded-lg text-ink/70"
              >
                {he ? "ביטול" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CheckoutFooter dict={dict} />
    </div>
  );
}

function CheckoutTopBar({
  locale,
  dict,
  branch,
}: {
  locale: Locale;
  dict: Dictionary;
  branch: BranchInfo | null;
}) {
  const { count, branchCompany } = useCart();
  const { user, displayName } = useAuth();
  const he = locale === "he";
  // הלוגו/השם מובילים לחנות הסניף הנוכחי — קישור דטרמיניסטי (לא תלוי ב-branch שנמשך בצד-לקוח)
  const home = branchHref(locale, branchCompany);
  const name = (he ? branch?.nameHe : branch?.nameEn) || dict.brand.name;
  const tagline = (he ? branch?.taglineHe : branch?.taglineEn) || dict.brand.tagline;
  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3 bg-white border-b border-line">
      <Link href={home} className="leading-none flex items-center gap-2.5">
        {branch?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branch.logoUrl} alt={name} className="h-10 w-10 rounded-lg object-cover flex-none" />
        )}
        <span>
          <span className="block font-brand text-lg sm:text-xl font-bold text-ink leading-none">{name}</span>
          <span className="block text-[9px] tracking-[2px] text-wine font-bold mt-0.5">{tagline}</span>
        </span>
      </Link>
      <div className="flex items-center gap-4 sm:gap-5 text-ink/80">
        <LangMenu locale={locale} />
        {user ? (
          <Link
            href={`/${locale}/account`}
            className="flex items-center gap-2 hover:text-wine"
            aria-label={displayName || dict.account.title}
          >
            <span className="w-7 h-7 rounded-full bg-wine text-white grid place-items-center text-xs font-bold">
              {(displayName[0] || "U").toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[120px] truncate text-sm">{displayName}</span>
          </Link>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="flex items-center gap-1.5 hover:text-wine"
            aria-label={dict.header.login}
          >
            <IconAccount className="w-6 h-6" />
            <span className="hidden sm:inline text-sm">{dict.header.login}</span>
          </Link>
        )}
        <FavoritesMenu locale={locale} />
        <Link href={home} className="relative flex items-center hover:text-wine" aria-label="cart">
          <IconCart className="w-6 h-6" />
          {count > 0 && (
            <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium text-ink/80 mb-1 ${className}`}>{children}</label>;
}
function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-red-500 text-xs mt-1">{children}</p>;
}
