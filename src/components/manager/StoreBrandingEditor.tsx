"use client";

import { useRef, useState } from "react";
import { saveStoreBrandingAction } from "@/app/[lang]/manager/actions";
import { SubmitButton } from "./SubmitButton";

export interface StoreBrandingInfo {
  id: string;
  nameHe: string;
  nameEn: string;
  type: "kitchen" | "grocery";
}
export interface StoreBrandingValue {
  name_he: string | null;
  name_en: string | null;
  logo_url: string | null;
}

export function StoreBrandingEditor({
  he,
  branch,
  store,
  value,
}: {
  he: boolean;
  branch: number;
  store: StoreBrandingInfo;
  value: StoreBrandingValue | null;
}) {
  const [logo, setLogo] = useState(value?.logo_url ?? "");
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
      setLogo(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  const defaultName = he ? store.nameHe : store.nameEn;

  return (
    <form
      action={saveStoreBrandingAction}
      className="bg-white border border-line rounded-xl p-4 space-y-3"
    >
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="store_id" value={store.id} />
      <input type="hidden" name="logo_url" value={logo} />

      <div className="flex items-center gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          className="h-12 w-12 rounded-lg bg-soft border border-line grid place-items-center cursor-pointer overflow-hidden flex-none hover:border-wine"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{store.type === "grocery" ? "🛒" : "🍳"}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold text-ink text-sm">
            {(he ? value?.name_he : value?.name_en) || defaultName}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold text-wine"
          >
            {uploading ? (he ? "מעלה…" : "Uploading…") : he ? "העלאת לוגו" : "Upload logo"}
          </button>
          {logo && (
            <button
              type="button"
              onClick={() => setLogo("")}
              className="text-xs font-bold text-red-500 ms-2"
            >
              {he ? "הסר" : "Remove"}
            </button>
          )}
        </div>
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
      {err && <p className="text-red-500 text-xs">{err}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-ink/55 mb-1">
            {he ? "שם (עברית)" : "Name (Hebrew)"}
          </label>
          <input
            name="name_he"
            defaultValue={value?.name_he ?? ""}
            placeholder={store.nameHe}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-ink/55 mb-1">
            {he ? "שם (אנגלית)" : "Name (English)"}
          </label>
          <input
            name="name_en"
            defaultValue={value?.name_en ?? ""}
            placeholder={store.nameEn}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <SubmitButton
        className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
        savedLabel={he ? "נשמר ✓" : "Saved ✓"}
      >
        {he ? "שמירה" : "Save"}
      </SubmitButton>
    </form>
  );
}
