"use client";

import { useState } from "react";
import { AddressAutocomplete } from "../AddressAutocomplete";

// שדה בחירת אזור משלוח עם השלמה אוטומטית מ-Google Places (מוגבל לתאילנד דרך הפרוקסי).
// מזין את שם האזור שנבחר ל-input מוסתר בשם "name" עבור הטופס.
export function ZoneAreaField({ he }: { he: boolean }) {
  const [v, setV] = useState("");
  return (
    <>
      <input type="hidden" name="name" value={v} />
      <AddressAutocomplete
        value={v}
        onChange={setV}
        placeholder={he ? "חיפוש אזור בגוגל…" : "Search area on Google…"}
        className="border border-line rounded-lg px-2 py-1.5 text-sm w-44 outline-none focus:border-wine"
      />
    </>
  );
}
