import type { LegalDocument } from "@/lib/legal/content";

// תצוגת מסמך משפטי (תקנון / מדיניות פרטיות) — קריא, ממורכז, על-פי המותג.
export function LegalDoc({ doc }: { doc: LegalDocument }) {
  return (
    <article className="w-full max-w-3xl bg-white border border-line rounded-2xl shadow-sm px-6 py-8 sm:px-10 sm:py-10">
      <h1 className="font-brand text-2xl sm:text-3xl text-wine mb-1">{doc.title}</h1>
      <p className="text-xs text-ink/50 mb-6">{doc.lastUpdated}</p>

      {doc.intro.map((p, i) => (
        <p key={`intro-${i}`} className="text-sm leading-7 text-ink/80 mb-3">
          {p}
        </p>
      ))}

      <div className="mt-6 space-y-7">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-bold text-base text-ink mb-2">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="text-sm leading-7 text-ink/75 mb-2">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-8 pt-5 border-t border-line text-xs italic text-ink/50">
        {doc.disclaimer}
      </p>
    </article>
  );
}
