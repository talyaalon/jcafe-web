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
  tab_logo_url: string | null;
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
  // logo = תמונת הקובייה במסך הבית · tabLogo = אייקון הלשונית בראש האתר
  const [logo, setLogo] = useState(value?.logo_url ?? "");
  const [tabLogo, setTabLogo] = useState(value?.tab_logo_url ?? "");
  const [uploading, setUploading] = useState<"logo" | "tab" | null>(null);
  const [err, setErr] = useState("");
  const homeRef = useRef<HTMLInputElement>(null);
  const tabRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, which: "logo" | "tab") {
    setErr("");
    setUploading(which);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "upload failed");
      (which === "logo" ? setLogo : setTabLogo)(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  }

  const defaultName = he ? store.nameHe : store.nameEn;
  const fallbackEmoji = store.type === "grocery" ? "🛒" : "🍳";

  return (
    <form
      action={saveStoreBrandingAction}
      className="bg-white border border-line rounded-xl p-4 space-y-3"
    >
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="store_id" value={store.id} />
      <input type="hidden" name="logo_url" value={logo} />
      <input type="hidden" name="tab_logo_url" value={tabLogo} />

      <div className="font-bold text-ink text-sm">
        {(he ? value?.name_he : value?.name_en) || defaultName}
      </div>

      {/* תמונת הקובייה במסך הבית */}
      <ImagePicker
        he={he}
        label={he ? "תמונה במסך הבית (קובייה)" : "Home page image (tile)"}
        url={logo}
        uploading={uploading === "logo"}
        fallbackEmoji={fallbackEmoji}
        previewClass="h-16 w-24"
        inputRef={homeRef}
        onUpload={(f) => upload(f, "logo")}
        onRemove={() => setLogo("")}
      />

      {/* אייקון הלשונית בראש האתר */}
      <ImagePicker
        he={he}
        label={he ? "אייקון בלשונית הניווט (ראש האתר)" : "Tab icon (top navigation)"}
        hint={he ? "אם ריק — תוצג תמונת הבית" : "If empty, the home image is used"}
        url={tabLogo}
        uploading={uploading === "tab"}
        fallbackEmoji={fallbackEmoji}
        previewClass="h-12 w-12"
        previewRound
        inputRef={tabRef}
        onUpload={(f) => upload(f, "tab")}
        onRemove={() => setTabLogo("")}
      />

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

function ImagePicker({
  he,
  label,
  hint,
  url,
  uploading,
  fallbackEmoji,
  previewClass,
  previewRound,
  inputRef,
  onUpload,
  onRemove,
}: {
  he: boolean;
  label: string;
  hint?: string;
  url: string;
  uploading: boolean;
  fallbackEmoji: string;
  previewClass: string;
  previewRound?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <label className="block text-[11px] text-ink/55 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          className={`${previewClass} ${previewRound ? "rounded-full" : "rounded-lg"} bg-soft border border-line grid place-items-center cursor-pointer overflow-hidden flex-none hover:border-wine`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{fallbackEmoji}</span>
          )}
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold text-wine"
          >
            {uploading ? (he ? "מעלה…" : "Uploading…") : he ? "העלאת תמונה" : "Upload image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-bold text-red-500 ms-2"
            >
              {he ? "הסר" : "Remove"}
            </button>
          )}
          {hint && <p className="text-[10px] text-ink/40 mt-0.5">{hint}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </div>
    </div>
  );
}
