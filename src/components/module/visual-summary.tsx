import type { VisualSummary } from '@/lib/types'

export function VisualSummaryView({ data }: { data: VisualSummary }) {
  if (!data) return null

  const centerText = data.conceptMap?.center || data.conceptMap?.central || 'Konsep Utama'
  const branches = (data.conceptMap?.branches || []).map((b) =>
    typeof b === 'string' ? { label: b, children: [] } : { label: b.label, children: b.children || [] },
  )
  const sections = (data.sections || []).map((s) => ({
    title: s.title || s.heading || 'Bagian',
    points: s.points || [],
  }))
  const glossary = (data.glossary || []).map((g) => ({
    term: g.term,
    meaning: g.meaning || g.definition || '',
  }))

  const gridCols =
    sections.length === 1
      ? 'grid-cols-1'
      : sections.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="rounded-2xl border-2 border-[#111] bg-lime p-4 sm:p-6 shadow-xs">
        <p className="text-base sm:text-lg font-bold leading-relaxed text-[#111] text-balance">
          {data.summary}
        </p>
      </div>

      {data.conceptMap && (
        <section id="peta-konsep" aria-labelledby="peta-konsep-heading" className="scroll-mt-24 flex flex-col gap-3 sm:gap-4">
          <h3 id="peta-konsep-heading" className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Peta konsep
          </h3>
          <div className="flex flex-col items-center gap-4 sm:gap-6 rounded-2xl border border-border bg-white p-4 sm:p-6 md:p-8 shadow-xs">
            <span className="inline-flex items-center justify-center rounded-full bg-[#111] px-5 py-2.5 sm:px-6 sm:py-3 text-center text-sm sm:text-base font-black text-white shadow-xs">
              {centerText}
            </span>
            <div aria-hidden="true" className="h-6 w-0.5 bg-neutral-300" />
            <ul className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4 w-full">
              {branches.map((b, i) => (
                <li
                  key={`${b.label}-${i}`}
                  className="flex min-w-[120px] max-w-full flex-col items-center justify-center rounded-xl sm:rounded-2xl border-2 border-[#111] bg-white px-4 py-3 sm:px-5 sm:py-4 text-center shadow-xs transition-transform hover:-translate-y-0.5"
                >
                  <span className="text-sm sm:text-base font-bold text-foreground">{b.label}</span>
                  {b.children && b.children.length > 0 && (
                    <span className="mt-1 text-xs font-medium text-muted-foreground max-w-[200px] leading-snug">
                      {b.children.join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {sections.length > 0 && (
        <div className={`grid gap-4 sm:gap-6 ${gridCols}`}>
          {sections.map((s, i) => (
            <section
              key={`${s.title}-${i}`}
              id={`section-${i + 1}`}
              className="scroll-mt-24 flex flex-col justify-between rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-xs"
            >
              <div>
                <h3 className="flex items-start gap-3 text-base sm:text-lg font-extrabold text-foreground">
                  <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-[#111] text-xs sm:text-sm font-bold text-white shadow-xs">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-snug">{s.title}</span>
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5 sm:gap-3">
                  {s.points.map((p, j) => (
                    <li key={`${p}-${j}`} className="flex items-start gap-3 text-sm sm:text-base leading-relaxed text-foreground/90">
                      <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-xs bg-[#111] ring-2 ring-lime" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      {glossary.length > 0 && (
        <section id="glosarium" aria-labelledby="glosarium-heading" className="scroll-mt-24 flex flex-col gap-3 sm:gap-4">
          <h3 id="glosarium-heading" className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Glosarium
          </h3>
          <dl className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
            {glossary.map((g, i) => (
              <div
                key={`${g.term}-${i}`}
                className="flex flex-col rounded-xl sm:rounded-2xl border border-border/80 bg-neutral-50/80 p-4 sm:p-5 transition-colors hover:bg-neutral-100/80"
              >
                <dt className="text-sm sm:text-base font-extrabold text-foreground">{g.term}</dt>
                <dd className="mt-1 sm:mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {g.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
