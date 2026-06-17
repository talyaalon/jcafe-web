"use client";

import { useEffect, useState } from "react";

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
