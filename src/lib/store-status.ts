"use client";

import { useEffect, useState } from "react";
import type { DayHours } from "@/lib/schedule";

// הוק שמביא את סטטוס הפתיחה (פתוח/סגור) של חנויות הסניף מהשרת.
export function useStoreStatus(company?: number): Record<string, boolean> {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let active = true;
    fetch(`/api/stores/status${company ? `?company=${company}` : ""}`)
      .then((r) => r.json())
      .then((d) => active && setStatuses(d.statuses ?? {}))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [company]);
  return statuses;
}

// הוק שמביא את שעות הפעילות המלאות של חנויות הסניף (לוולידציית תזמון).
export function useStoreHours(company?: number): Record<string, DayHours[]> {
  const [hours, setHours] = useState<Record<string, DayHours[]>>({});
  useEffect(() => {
    let active = true;
    fetch(`/api/stores/hours${company ? `?company=${company}` : ""}`)
      .then((r) => r.json())
      .then((d) => active && setHours(d.hours ?? {}))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [company]);
  return hours;
}
