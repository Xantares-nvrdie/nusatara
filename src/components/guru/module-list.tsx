'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Search, Wand2 } from 'lucide-react'
import { EmptyState, btnLime, inputClass } from '@/components/site/form'
import { PageHeader } from '@/components/guru/guru-shell'
import { formatDate } from '@/lib/format'
import { useStore } from '@/lib/store'

export function ModuleList() {
  const allModules = useStore((s) => s.modules)
  const myIds = useStore((s) => s.myModuleIds)
  // Only the signed-in teacher's own modules (from GET /modules/mine), not every public module.
  const modules = useMemo(() => allModules.filter((m) => myIds.includes(m.id)), [allModules, myIds])
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () => modules.filter((m) => m.title.toLowerCase().includes(q.trim().toLowerCase())),
    [modules, q],
  )

  return (
    <div data-state={modules.length === 0 ? 'empty' : 'ready'}>
      <PageHeader
        title="Modul"
        description="Materi Anda yang sudah dikonversi menjadi audio dan visual."
        action={
          <Link href="/guru/modul/baru" className={btnLime}>
            <Wand2 className="size-4" aria-hidden="true" /> Konversi materi
          </Link>
        }
      />
      {modules.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          text="Belum ada modul."
          action={
            <Link href="/guru/modul/baru" className={btnLime}>
              Konversi materi
            </Link>
          }
        />
      ) : (
        <>
          <div className="relative mb-6 max-w-sm">
            <label htmlFor="cari-modul" className="sr-only">
              Cari modul
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="cari-modul"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul modul"
              className={`${inputClass} pl-11`}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Tidak ada modul yang cocok dengan “{q}”.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/guru/modul/${m.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                  >
                    <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-lime">
                      <BookOpen className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-lg font-extrabold leading-snug">{m.title}</span>
                    <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">{m.deafVisualSummary?.summary || m.summary || 'Klik untuk melihat detail materi.'}</span>
                    <span className="mt-auto flex items-center justify-between pt-5 text-sm text-muted-foreground">
                      {formatDate(m.createdAt)}
                      <ArrowRight className="size-4 text-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
