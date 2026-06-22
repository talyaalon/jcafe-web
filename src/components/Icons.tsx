// אייקוני קו נקיים (Feather/Lucide style) — משלוח, איסוף, אזור אישי, עגלה.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconDelivery({ className = "w-6 h-6" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M9.5 16.5H14V6H4.5v10.5H6" />
      <path d="M14 9.3h3.3l3.2 3.2v4H18.5" />
      <circle cx="7.7" cy="16.8" r="1.6" />
      <circle cx="16.8" cy="16.8" r="1.6" />
      <path d="M1.6 9.2h2.2M1.2 12.4h1.8" />
    </svg>
  );
}

export function IconPickup({ className = "w-6 h-6" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M6 8.3h12l-1 12H7l-1-12Z" />
      <path d="M8.8 8.3V6.6a3.2 3.2 0 0 1 6.4 0v1.7" />
    </svg>
  );
}

export function IconAccount({ className = "w-6 h-6" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.5 20c0-3.5 2.9-5.7 6.5-5.7s6.5 2.2 6.5 5.7" />
    </svg>
  );
}

export function IconCart({ className = "w-6 h-6" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17.5" cy="20" r="1.5" />
      <path d="M2.5 3.5H5l2.25 11.1a1.4 1.4 0 0 0 1.37 1.12h8.3a1.4 1.4 0 0 0 1.37-1.1L21 7H6" />
    </svg>
  );
}

// ===== אייקוני ניהול (sidebar) =====
export function IconOrders({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}
export function IconCustomers({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8" />
      <path d="M18 13.7c1.9.5 3.5 1.9 3.5 4.3" />
    </svg>
  );
}
export function IconClock({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
export function IconImage({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5L5 19" />
    </svg>
  );
}
export function IconTag({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M3.6 11.6l8-8H20a.5.5 0 0 1 .5.5v8.4l-8 8a1 1 0 0 1-1.4 0l-7-7a1 1 0 0 1 0-1.4Z" />
      <circle cx="16" cy="8" r="1.3" />
    </svg>
  );
}
export function IconCard({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h4" />
    </svg>
  );
}
export function IconBox({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4.2 7.6l7.8 4.4 7.8-4.4M12 12v9" />
    </svg>
  );
}
export function IconBell({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 2 5.5 2 5.5H4s2-1 2-5.5Z" />
      <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
    </svg>
  );
}
export function IconGear({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.6v2.4M12 19v2.4M4.6 12H2.2M21.8 12h-2.4M5.7 5.7l1.7 1.7M16.6 16.6l1.7 1.7M18.3 5.7l-1.7 1.7M7.4 16.6l-1.7 1.7" />
    </svg>
  );
}
export function IconMail({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}
export function IconChat({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" />
    </svg>
  );
}
export function IconStore({ className = "w-5 h-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...base}>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 4h18l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-5Z" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}
