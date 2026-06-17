"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";

type Section = "dashboard" | "orders" | "downloads" | "addresses" | "details";

// נתוני דמה — יוחלפו בנתוני המשתמש מ-ODOO/DB לאחר חיבור auth.
const MOCK = {
  first: "talya",
  last: "israel",
  display: "chabad",
  email: "tkp.rama4@gmail.com",
  address: ["talya israel", "sukumvit 22", "85", "bangkok", "Bangkok", "10110"],
  orders: [
    { no: "#1086", date: "23/06/2025", status: "processing", total: 2051, items: 6 },
    { no: "#1005", date: "20/06/2025", status: "processing", total: 2101, items: 7 },
    { no: "#897", date: "18/06/2025", status: "processing", total: 4291, items: 11 },
    { no: "#868", date: "17/06/2025", status: "processing", total: 1207, items: 7 },
    { no: "#861", date: "17/06/2025", status: "processing", total: 2893, items: 12 },
    { no: "#719", date: "12/06/2025", status: "onHold", total: 5913, items: 32 },
  ],
};

export function AccountView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const a = dict.account;
  const [section, setSection] = useState<Section>("dashboard");

  const nav: { key: Section; label: string }[] = [
    { key: "dashboard", label: a.dashboard },
    { key: "orders", label: a.orders },
    { key: "downloads", label: a.downloads },
    { key: "addresses", label: a.addresses },
    { key: "details", label: a.accountDetails },
  ];

  const fieldRO =
    "w-full bg-soft border border-line rounded-md px-3 py-2.5 text-sm text-ink/70";
  const label = "block text-sm text-ink/70 mb-1";

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-extrabold text-wine text-center mb-8">{a.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* sidebar */}
        <aside className="border border-line rounded-lg overflow-hidden h-fit">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={`w-full text-start px-4 py-3 text-sm border-b border-line transition ${
                section === n.key
                  ? "bg-soft text-wine font-bold"
                  : "text-ink/70 hover:bg-soft/60"
              }`}
            >
              {n.label}
            </button>
          ))}
          <Link
            href={`/${locale}`}
            className="block px-4 py-3 text-sm text-ink/70 hover:bg-soft/60"
          >
            {a.logout}
          </Link>
        </aside>

        {/* content */}
        <section className="border border-line rounded-lg p-6 bg-white">
          {section === "dashboard" && (
            <div className="text-sm leading-relaxed">
              <p className="mb-3">
                {a.hello} <b className="text-wine">{MOCK.display}</b>
              </p>
              <p className="text-ink/70">{a.dashIntro}</p>
            </div>
          )}

          {section === "orders" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink/60 text-start">
                    <th className="text-start font-bold py-2">{a.order}</th>
                    <th className="text-start font-bold py-2">{a.date}</th>
                    <th className="text-start font-bold py-2">{a.status}</th>
                    <th className="text-start font-bold py-2">{a.total}</th>
                    <th className="text-start font-bold py-2">{a.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK.orders.map((o) => (
                    <tr key={o.no} className="border-t border-line">
                      <td className="py-3 font-bold text-wine">{o.no}</td>
                      <td className="py-3 text-ink/70">{o.date}</td>
                      <td className="py-3 text-ink/70">
                        {o.status === "onHold" ? a.onHold : a.processing}
                      </td>
                      <td className="py-3 text-ink/70">
                        {formatTHB(o.total)} {a.forItems.replace("{n}", String(o.items))}
                      </td>
                      <td className="py-3">
                        <button className="border border-wine text-wine rounded px-3 py-1 text-xs font-bold">
                          {a.view}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {section === "downloads" && (
            <p className="text-ink/60 text-sm">—</p>
          )}

          {section === "addresses" && (
            <div>
              <p className="text-ink/60 text-sm mb-5">{a.addrNote}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[a.billing, a.shipping].map((title, i) => (
                  <div key={title}>
                    <h2 className="text-xl text-ink mb-2">{title}</h2>
                    <div className="border border-line rounded p-4">
                      <a className="text-wine font-bold text-sm cursor-pointer">
                        {i === 0 ? a.editBilling : a.editShipping}
                      </a>
                      <div className="text-ink/60 text-[13px] italic mt-2 space-y-0.5">
                        {MOCK.address.map((l, j) => (
                          <div key={j}>{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "details" && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>{a.firstName} *</label>
                  <input defaultValue={MOCK.first} className={fieldRO} />
                </div>
                <div>
                  <label className={label}>{a.lastName} *</label>
                  <input defaultValue={MOCK.last} className={fieldRO} />
                </div>
              </div>
              <div>
                <label className={label}>{a.displayName} *</label>
                <input defaultValue={MOCK.display} className={fieldRO} />
                <p className="text-xs text-ink/45 italic mt-1">{a.displayHint}</p>
              </div>
              <div>
                <label className={label}>{a.emailAddr} *</label>
                <input defaultValue={MOCK.email} className={fieldRO} />
              </div>

              <h3 className="font-bold text-ink pt-2">{a.passwordChange}</h3>
              <div>
                <label className={label}>{a.currentPassword}</label>
                <input type="password" className={fieldRO} />
              </div>
              <div>
                <label className={label}>{a.newPasswordOpt}</label>
                <input type="password" className={fieldRO} />
              </div>
              <div>
                <label className={label}>{a.confirmPassword}</label>
                <input type="password" className={fieldRO} />
              </div>

              <button className="bg-wine text-white font-bold rounded-md px-6 py-3 mt-2 hover:bg-wine-hover">
                {a.saveChanges}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
