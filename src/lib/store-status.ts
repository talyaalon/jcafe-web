"use client";

import { useEffect, useState } from "react";
import type { DayHours } from "@/lib/schedule";

// הוק שמביא את סטטוס הפתיחה (פתוח/סגור) של כל החנויות מהשרת.
export function useStoreStatus(): Record<string, boolean> {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let active = true;
    fetch("/api/stores/status")
      .then((r) => r.json())
      .then((d) => active && setStatuses(d.statuses ?? {}))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return statuses;
}

// הוק שמביא את שעות הפעילות המלאות של כל החנויות (לוולידציית תזמון).
export function useStoreHours(): Record<string, DayHours[]> {
  const [hours, setHours] = useState<Record<string, DayHours[]>>({});
  useEffect(() => {
    let active = true;
    fetch("/api/stores/hours")
      .then((r) => r.json())
      .then((d) => active && setHours(d.hours ?? {}))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return hours;
}
