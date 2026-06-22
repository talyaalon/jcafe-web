"use client";

import { useRef, useState } from "react";
import { editBannerAction } from "@/app/[lang]/manager/actions";
import { ProductPicker, type PickerProduct } from "./ProductPicker";

export interface EditBanner {
  id: number;
  title: string | null;
  image_url: string;
  product_id?: string | null;
  discount_percent?: number | null;
}

export function BannerEditor({
  banner,
  products,
  he,
  onDone,
}: {
  banner: EditBanner;
  products: PickerProduct[];
  he: boolean;
  onDone: () => void;
}) {
  const [url, setUrl] = useState(banner.image_url);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.ok) setUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={editBannerAction} className="space-y-2">
      <input type="hidden" name="id" value={banner.id} />
      <input type="hidden" name="image_url" value={url} />

      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="w-full h-24 object-cover rounded-lg border border-line" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-1 end-1 bg-white/90 border border-line rounded-lg px-2 py-0.5 text-[11px] font-bold shadow"
        >
          {uploading ? (he ? "מעלה…" : "…") : he ? "החלף תמונה" : "Change image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>

      <input
        name="title"
        defaultValue={banner.title ?? ""}
        placeholder={he ? "כותרת" : "Title"}
        className="w-full border border-line rounded px-2 py-1 text-sm"
      />
      <ProductPicker
        products={products}
        he={he}
        name="product_id"
        defaultId={banner.product_id ?? ""}
        discountName="discount_percent"
        defaultDiscount={banner.discount_percent ?? 0}
      />

      <div className="flex gap-2 items-center">
        <button className="bg-wine text-white text-xs font-bold rounded px-3 py-1.5">
          {he ? "שמור" : "Save"}
        </button>
        <button type="button" onClick={onDone} className="text-xs text-ink/50">
          {he ? "ביטול" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
