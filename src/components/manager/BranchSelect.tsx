"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function BranchSelect({
  locale,
  branches,
  current,
  path = "manager/preview",
  allLabel,
}: {
  locale: Locale;
  branches: { companyId: number; name: string; count?: number }[];
  current: number;
  path?: string;
  /** אם מוגדר — נוספת אופציית "כל הסניפים" (value 0, ללא ?company) */
  allLabel?: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) =>
        router.push(
          e.target.value === "0"
            ? `/${locale}/${path}`
            : `/${locale}/${path}?company=${e.target.value}`,
        )
      }
      className="bg-white/15 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm font-bold outline-none cursor-pointer [&>option]:text-ink"
    >
      {allLabel && <option value={0}>{allLabel}</option>}
      {branches.map((b) => (
        <option key={b.companyId} value={b.companyId}>
          {b.name}
          {b.count != null ? ` (${b.count})` : ""}
        </option>
      ))}
    </select>
  );
}
