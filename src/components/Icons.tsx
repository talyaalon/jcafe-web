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
