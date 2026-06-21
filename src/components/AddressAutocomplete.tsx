"use client";

import { useRef, useState } from "react";

interface Prediction {
  description: string;
  placeId: string;
}

// שדה כתובת עם השלמה אוטומטית (Google Places דרך פרוקסי בשרת).
export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function query(input: string) {
    if (tRef.current) clearTimeout(tRef.current);
    if (input.trim().length < 3) {
      setPreds([]);
      setOpen(false);
      return;
    }
    tRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
        const d = (await r.json()) as { predictions?: Prediction[] };
        setPreds(d.predictions ?? []);
        setOpen((d.predictions ?? []).length > 0);
      } catch {
        setPreds([]);
      }
    }, 300);
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          query(e.target.value);
        }}
        onFocus={() => preds.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && preds.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <ul className="absolute z-40 mt-1 w-full bg-white border border-line rounded-lg shadow-xl max-h-60 overflow-auto">
            {preds.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.description);
                    setPreds([]);
                    setOpen(false);
                  }}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-soft border-b border-line/50 last:border-0"
                >
                  {p.description}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
