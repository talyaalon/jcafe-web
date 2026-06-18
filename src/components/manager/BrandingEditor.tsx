"use client";

import { useRef, useState } from "react";
import { saveBrandingAction } from "@/app/[lang]/manager/actions";
import { SubmitButton } from "./SubmitButton";

export interface Branding {
  name_he: string | null;
  name_en: string | null;
  tagline_he: string | null;
  tagline_en: string | null;
  logo_url: string | null;
}

export function BrandingEditor({
  he,
  branch,
  branding,
}: {
  he: boolean;
  branch: number;
  branding: Branding | null;
}) {
  const [logo, setLogo] = useState(branding?.logo_url ?? "");
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

  const fields: [keyof Branding, string][] = [
    ["name_he", he ? "שם החנות (עברית)" : "Store name (Hebrew)"],
    ["name_en", he ? "שם החנות (אנגלית)" : "Store name (English)"],
    ["tagline_he", he ? "סלוגן (עברית)" : "Tagline (Hebrew)"],
    ["tagline_en", he ? "סלוגן (אנגלית)" : "Tagline (English)"],
  ];

  return (
    <form
      action={saveBrandingAction}
      className="bg-white border border-line rounded-xl p-4 max-w-lg space-y-4"
    >
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="logo_url" value={logo} />

      {/* preview — איך זה ייראה בפינה למעלה */}
      <div className="flex items-center gap-2.5 border border-line rounded-lg p-3 bg-soft">
        <div
          onClick={() => inputRef.current?.click()}
          className="h-12 w-12 rounded-lg bg-white border border-line grid place-items-center cursor-pointer overflow-hidden flex-none hover:border-wine"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl text-ink/40">📷</span>
          )}
        </div>
        <div className="leading-none">
          <span className="block text-xl font-extrabold text-ink">
            {(he ? branding?.name_he : branding?.name_en) || (he ? "שם החנות" : "Store name")}
          </span>
          <span className="block text-[11px] tracking-[2px] text-wine font-bold mt-0.5">
            {(he ? branding?.tagline_he : branding?.tagline_en) || (he ? "סלוגן" : "Tagline")}
          </span>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold text-wine border border-line rounded-lg px-3 py-1.5"
        >
          {uploading ? (he ? "מעלה…" : "Uploading…") : he ? "העלאת לוגו" : "Upload logo"}
        </button>
        {logo && (
          <button
            type="button"
            onClick={() => setLogo("")}
            className="text-xs font-bold text-red-500 ms-2"
          >
            {he ? "הסר לוגו" : "Remove logo"}
          </button>
        )}
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
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(([name, label]) => (
          <div key={name}>
            <label className="block text-[11px] text-ink/55 mb-1">{label}</label>
            <input
              name={name}
              defaultValue={branding?.[name] ?? ""}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <SubmitButton
        className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
        savedLabel={he ? "נשמר ✓" : "Saved ✓"}
      >
        {he ? "שמירת מיתוג" : "Save branding"}
      </SubmitButton>
    </form>
  );
}
