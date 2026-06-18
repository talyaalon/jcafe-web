"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function BranchSelect({
  locale,
  branches,
  current,
}: {
  locale: Locale;
  branches: { companyId: number; name: string; count: number }[];
  current: number;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/${locale}/manager/preview?company=${e.target.value}`)}
      className="bg-white/15 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm font-bold outline-none cursor-pointer [&>option]:text-ink"
    >
      {branches.map((b) => (
        <option key={b.companyId} value={b.companyId}>
          {b.name} ({b.count})
        </option>
      ))}
    </select>
  );
}
