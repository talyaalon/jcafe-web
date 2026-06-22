"use client";

import { savePaymentAction } from "@/app/[lang]/manager/actions";
import { SubmitButton } from "./SubmitButton";

export interface PaymentValue {
  card: boolean;
  qr: boolean;
  cod: boolean;
}

export function PaymentEditor({
  branch,
  he,
  payment,
}: {
  branch: number;
  he: boolean;
  payment: PaymentValue;
}) {
  const opts: { key: keyof PaymentValue; label: string; icon: string }[] = [
    { key: "card", label: he ? "כרטיס אשראי / דביט" : "Credit / Debit card", icon: "💳" },
    { key: "qr", label: "QR PromptPay", icon: "📱" },
    { key: "cod", label: he ? "מזומן במסירה" : "Cash on delivery", icon: "💵" },
  ];
  return (
    <form action={savePaymentAction} className="bg-white border border-line rounded-xl p-4 max-w-lg">
      <input type="hidden" name="branch" value={branch} />
      <div className="space-y-1">
        {opts.map((o) => (
          <label
            key={o.key}
            className="flex items-center justify-between gap-3 py-3 border-b border-line/50 last:border-0 cursor-pointer"
          >
            <span className="font-semibold text-ink">
              {o.icon} {o.label}
            </span>
            <input
              type="checkbox"
              name={o.key}
              defaultChecked={payment[o.key]}
              className="w-5 h-5 accent-wine"
            />
          </label>
        ))}
      </div>
      <SubmitButton
        className="mt-3 bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
        savedLabel={he ? "נשמר ✓" : "Saved ✓"}
      >
        {he ? "שמירה" : "Save"}
      </SubmitButton>
    </form>
  );
}
