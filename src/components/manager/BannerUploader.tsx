"use client";

import { useRef, useState } from "react";
import { addBannerAction } from "@/app/[lang]/manager/actions";
import { ProductPicker, type PickerProduct } from "./ProductPicker";

export function BannerUploader({
  he,
  branch,
  products,
}: {
  he: boolean;
  branch: number;
  products: PickerProduct[];
}) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "upload failed");
      setUrl(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={addBannerAction} className="bg-white border border-line rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-ink">{he ? "הוספת באנר חדש" : "Add new banner"}</h3>

      {/* dropzone / picker / camera */}
      <div className="relative">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className="border-2 border-dashed border-line rounded-xl h-40 grid place-items-center cursor-pointer hover:border-wine bg-soft text-center overflow-hidden"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-ink/50 text-sm px-4">
              <div className="text-3xl mb-1">📷</div>
              {uploading
                ? he
                  ? "מעלה…"
                  : "Uploading…"
                : he
                  ? "גררו תמונה לכאן · או לחצו לבחירה / צילום"
                  : "Drag image here · or click to choose / take photo"}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </div>
        {url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUrl("");
            }}
            className="absolute top-2 end-2 bg-white/90 border border-line rounded-full w-7 h-7 grid place-items-center text-ink/60 hover:text-red-500 shadow"
            aria-label={he ? "הסר תמונה" : "Remove image"}
          >
            ✕
          </button>
        )}
      </div>
      {err && <p className="text-red-500 text-xs">{err}</p>}

      <input type="hidden" name="image_url" value={url} />
      <input type="hidden" name="branch" value={branch} />
      <input
        name="title"
        placeholder={he ? "כותרת (אופציונלי)" : "Title (optional)"}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm"
      />

      {/* קישור = מוצר מהסניף (נפתח בלחיצה על הבאנר) */}
      <div>
        <label className="block text-xs text-ink/55 mb-1">
          {he ? "קישור למוצר (נפתח בלחיצה על הבאנר)" : "Link to product (opens on banner click)"}
        </label>
        <ProductPicker products={products} he={he} name="product_id" discountName="discount_percent" />
      </div>

      <button
        type="submit"
        disabled={!url || uploading}
        className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover disabled:opacity-50 block"
      >
        {he ? "הוסף באנר" : "Add banner"}
      </button>
    </form>
  );
}
