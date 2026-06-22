"use client";

import { useState } from "react";
import { saveThemeAction, resetThemeAction } from "@/app/[lang]/manager/actions";
import { SubmitButton } from "./SubmitButton";

export interface ThemeValue {
  primary_color: string | null;
  primary_hover: string | null;
  primary_bright: string | null;
  accent_color: string | null;
}

const DEFAULTS = {
  primary_color: "#861e74",
  primary_hover: "#6d1860",
  primary_bright: "#a02a8c",
  accent_color: "#861e74",
};

const PRESETS: { name: string; c: typeof DEFAULTS }[] = [
  { name: "סגול מותג", c: { primary_color: "#861e74", primary_hover: "#6d1860", primary_bright: "#a02a8c", accent_color: "#861e74" } },
  { name: "יין", c: { primary_color: "#9b1c31", primary_hover: "#7a1626", primary_bright: "#c0392b", accent_color: "#9b1c31" } },
  { name: "ירוק", c: { primary_color: "#1f7a4d", primary_hover: "#155c39", primary_bright: "#2ecc71", accent_color: "#1f7a4d" } },
  { name: "כחול", c: { primary_color: "#1e5fa8", primary_hover: "#16487f", primary_bright: "#3b82f6", accent_color: "#1e5fa8" } },
  { name: "כתום חם", c: { primary_color: "#c2410c", primary_hover: "#9a3412", primary_bright: "#f97316", accent_color: "#c2410c" } },
  { name: "שחור-זהב", c: { primary_color: "#2e2e2e", primary_hover: "#161616", primary_bright: "#4d4d4d", accent_color: "#c79a3a" } },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ThemeEditor({ branch, he, theme }: { branch: number; he: boolean; theme: ThemeValue | null }) {
  const [c, setC] = useState({
    primary_color: theme?.primary_color || DEFAULTS.primary_color,
    primary_hover: theme?.primary_hover || DEFAULTS.primary_hover,
    primary_bright: theme?.primary_bright || DEFAULTS.primary_bright,
    accent_color: theme?.accent_color || DEFAULTS.accent_color,
  });
  const set = (k: keyof typeof c, v: string) => setC((p) => ({ ...p, [k]: v }));

  const fields: { key: keyof typeof c; label: string }[] = [
    { key: "primary_color", label: he ? "צבע ראשי (כפתורים, פעיל)" : "Primary (buttons, active)" },
    { key: "primary_hover", label: he ? "צבע ריחוף (Hover)" : "Hover" },
    { key: "primary_bright", label: he ? "צבע בהיר (גרדיאנט)" : "Bright (gradient)" },
    { key: "accent_color", label: he ? "צבע משני (אקסנט)" : "Accent (secondary)" },
  ];

  return (
    <div className="max-w-2xl">
      {/* live preview */}
      <div className="bg-white border border-line rounded-xl p-4 mb-4">
        <div className="text-[13px] font-bold text-ink/70 mb-2">{he ? "תצוגה מקדימה" : "Preview"}</div>
        <div
          className="rounded-xl p-4 flex items-center gap-3 flex-wrap"
          style={{ background: `linear-gradient(135deg, ${c.primary_color}, ${c.primary_bright})` }}
        >
          <span className="text-white font-extrabold text-lg">J Cafe</span>
          <button type="button" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: c.primary_hover }}>
            {he ? "כפתור" : "Button"}
          </button>
          <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: c.accent_color }}>
            {he ? "אקסנט" : "Accent"}
          </span>
        </div>
      </div>

      {/* presets */}
      <div className="bg-white border border-line rounded-xl p-4 mb-4">
        <div className="text-[13px] font-bold text-ink/70 mb-2">{he ? "ערכות מוכנות" : "Presets"}</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setC(p.c)}
              className="flex items-center gap-2 border border-line rounded-lg px-2.5 py-1.5 text-xs font-bold hover:border-wine"
            >
              <span className="flex">
                <span className="w-3.5 h-3.5 rounded-s-full" style={{ background: p.c.primary_color }} />
                <span className="w-3.5 h-3.5" style={{ background: p.c.primary_bright }} />
                <span className="w-3.5 h-3.5 rounded-e-full" style={{ background: p.c.accent_color }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* color pickers form */}
      <form action={saveThemeAction} className="bg-white border border-line rounded-xl p-4 space-y-3">
        <input type="hidden" name="branch" value={branch} />
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <label className="text-sm text-ink/80">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name={f.key}
                value={c[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                className={`w-28 border rounded-lg px-2 py-1.5 text-sm font-mono ${
                  HEX.test(c[f.key]) ? "border-line" : "border-red-400"
                }`}
              />
              <input
                type="color"
                value={HEX.test(c[f.key]) ? c[f.key] : "#000000"}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-10 h-9 rounded-lg border border-line cursor-pointer bg-white"
                aria-label={f.label}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <SubmitButton
            className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
            savedLabel={he ? "נשמר ✓" : "Saved ✓"}
          >
            {he ? "שמירה והחלה על האתר" : "Save & apply to site"}
          </SubmitButton>
          <button
            type="submit"
            formAction={resetThemeAction}
            className="text-sm text-ink/55 border border-line rounded-lg px-3 py-2 hover:border-wine"
          >
            {he ? "איפוס לברירת מחדל" : "Reset to default"}
          </button>
        </div>
      </form>
      <p className="text-[11px] text-ink/45 mt-2">
        {he
          ? "השינוי חל על חזית הסניף (צבעי כפתורים, לשוניות, הדגשות וכו׳)."
          : "Applies to this branch's storefront (buttons, tabs, highlights, etc.)."}
      </p>
    </div>
  );
}
