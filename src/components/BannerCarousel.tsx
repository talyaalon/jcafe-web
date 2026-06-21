"use client";

import { useEffect, useRef, useState } from "react";
import type { Banner } from "./Storefront";

function BannerItem({
  b,
  onProductClick,
  heightCls,
}: {
  b: Banner;
  onProductClick: (id: string) => void;
  heightCls: string;
}) {
  const inner = (
    <>
      {/* object-contain — תמונה מלאה בלי חיתוך */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.image_url} alt={b.title ?? ""} className="w-full h-full object-contain" />
      {b.title && (
        <span className="absolute bottom-2 start-3 bg-black/45 text-white text-xs font-bold px-2.5 py-1 rounded-md">
          {b.title}
        </span>
      )}
    </>
  );
  const cls = `relative block w-full text-start ${heightCls} rounded-2xl overflow-hidden border border-line bg-soft`;
  return b.product_id ? (
    <button onClick={() => onProductClick(b.product_id!)} className={cls}>
      {inner}
    </button>
  ) : (
    <a href={b.link ?? undefined} className={cls}>
      {inner}
    </a>
  );
}

// מובייל: קרוסלה אופקית אחת שמתחלפת לבד וניתנת להחלקה. דסקטופ: 3 בשורה.
export function BannerCarousel({
  banners,
  onProductClick,
}: {
  banners: Banner[];
  onProductClick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const items = banners.slice(0, 6);

  // החלפה אוטומטית כל ~4.5 שניות (מובייל)
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || el.clientWidth === 0) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % items.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 4500);
    return () => clearInterval(t);
  }, [items.length]);

  const onScroll = () => {
    const el = ref.current;
    if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <>
      {/* mobile — carousel */}
      <div className="sm:hidden">
        <div
          ref={ref}
          onScroll={onScroll}
          dir="ltr"
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {items.map((b) => (
            <div key={b.id} className="snap-center shrink-0 w-full">
              <BannerItem b={b} onProductClick={onProductClick} heightCls="h-32" />
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-4 bg-wine" : "w-1.5 bg-ink/25"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* desktop — 3 across */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
        {banners.slice(0, 3).map((b) => (
          <BannerItem key={b.id} b={b} onProductClick={onProductClick} heightCls="h-44" />
        ))}
      </div>
    </>
  );
}
