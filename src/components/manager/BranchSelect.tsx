"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function BranchSelect({
  locale,
  branches,
  current,
  path = "manager/preview",
  allLabel,
  manager = false,
}: {
  locale: Locale;
  branches: { companyId: number; name: string; count?: number }[];
  current: number;
  path?: string;
  /** אם מוגדר — נוספת אופציית "כל הסניפים" (value 0, ללא ?company) */
  allLabel?: string;
  /** במסך מלקט-מנהל — שומר את הדגל manager=1 בעת החלפת סניף */
  manager?: boolean;
}) {
  const router = useRouter();
  const hrefFor = (value: string) => {
    const params: string[] = [];
    if (manager) params.push("manager=1");
    if (value !== "0") params.push(`company=${value}`);
    return `/${locale}/${path}${params.length ? `?${params.join("&")}` : ""}`;
  };
  return (
    <select
      value={current}
      onChange={(e) => router.push(hrefFor(e.target.value))}
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
