'use client'

import Link from 'next/link'
import { ArrowUpRight, BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/site/form'
import { useStore } from '@/lib/store'

export function ModuleCards({ base }: { base: '/tunarungu/kartu' | '/tunanetra/modul' }) {
  const modules = useStore((s) => s.modules)
  if (!modules.length) return <EmptyState icon={BookOpen} text="Belum ada modul dari guru." />
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <li key={m.id}>
          <Link
            href={`${base}/${m.id}`}
            className="group flex h-full flex-col gap-4 rounded-3xl border border-border bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#111] hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-lime">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <ArrowUpRight className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-extrabold">{m.title}</h2>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {m.deafVisualSummary?.summary || 'Klik untuk mempelajari materi ini.'}
            </p>
            <p className="mt-auto text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {m.deafVisualSummary?.sections?.length ? `${m.deafVisualSummary.sections.length} bagian · ` : ''}
              {m.teacherName}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
