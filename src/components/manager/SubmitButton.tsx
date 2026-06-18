"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// כפתור שליחה עם משוב: "שומר…" בזמן הפעולה, ואז "נשמר ✓" ירוק לרגע.
export function SubmitButton({
  children,
  savedLabel,
  pendingLabel = "…",
  className = "",
}: {
  children: React.ReactNode;
  savedLabel: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setSaved(false);
    } else if (wasPending.current) {
      wasPending.current = false;
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2200);
      return () => clearTimeout(t);
    }
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} transition ${saved ? "!bg-brand-green !text-white !border-brand-green" : ""} ${pending ? "opacity-70" : ""}`}
    >
      {pending ? pendingLabel : saved ? savedLabel : children}
    </button>
  );
}
