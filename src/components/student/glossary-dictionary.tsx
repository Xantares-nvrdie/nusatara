'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Search } from 'lucide-react'
import { EmptyState, Skeleton } from '@/components/site/form'
import { api } from '@/lib/api'
import { useHydrated } from '@/lib/store'
import { cn } from '@/lib/utils'

type GlossaryTerm = { term: string; definition: string; moduleId: string; moduleTitle: string }

const ALL = 'semua'
const normalize = (s: string) => s.toLocaleLowerCase('id')
const byTerm = (a: GlossaryTerm, b: GlossaryTerm) => a.term.localeCompare(b.term, 'id', { sensitivity: 'base' })

/**
 * Student glossary built from each module's deafVisualSummary.glossary (term + definition),
 * so every entry comes from material a teacher saved and reviewed. No sign-language content.
 */
export function GlossaryDictionary() {
  const hydrated = useHydrated()
  const [remote, setRemote] = useState<GlossaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [moduleId, setModuleId] = useState(ALL)

  const load = () => {
    setLoading(true)
    setLoadError(false)
    api<{ items: GlossaryTerm[] }>('/modules/glossary')
      .then((res) => setRemote(res.items ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Straight from the database (GET /modules/glossary), already sorted A-Z by the server.
  const terms = useMemo(() => [...remote].filter((t) => t.term && t.definition).sort(byTerm), [remote])

  const moduleOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of terms) if (!seen.has(t.moduleId)) seen.set(t.moduleId, t.moduleTitle)
    return [...seen].map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title, 'id'))
  }, [terms])

  const query = normalize(search.trim())
  const filtered = terms.filter(
    (t) =>
      (moduleId === ALL || t.moduleId === moduleId) &&
      (!query || normalize(t.term).includes(query) || normalize(t.definition).includes(query)),
  )

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
            <BookOpen className="size-3.5" aria-hidden="true" />
            Kamus Istilah
          </span>
          <span className="text-xs text-white/70">Dari modul pelajaran</span>
        </div>
        <h1 className="text-2xl font-black md:text-4xl">Kamus Istilah Pelajaran</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">
          Istilah penting dari setiap modul, dijelaskan dengan kata sehari-hari. Pilih nama modul di kartu untuk membuka
          materinya.
        </p>
      </div>

      {/* Search & module filter */}
      <div className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari istilah (contoh: Klorofil)..."
              aria-label="Cari istilah"
              className="w-full rounded-2xl border border-neutral-200 py-2.5 pl-11 pr-4 text-xs font-semibold text-neutral-900 focus:border-black focus:outline-none"
            />
          </div>
          <p role="status" className="text-xs font-bold text-neutral-500">
            {hydrated && !loading ? `${filtered.length} istilah` : ''}
          </p>
        </div>

        {moduleOptions.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Saring berdasarkan modul">
            {[{ id: ALL, title: 'Semua modul' }, ...moduleOptions].map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={moduleId === opt.id}
                onClick={() => setModuleId(opt.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-bold transition-all',
                  moduleId === opt.id
                    ? 'bg-black font-black text-lime shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                )}
              >
                {opt.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terms */}
      {!hydrated || loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={BookOpen}
          text="Kamus istilah belum bisa dimuat. Periksa koneksi lalu coba lagi."
          action={
            <button type="button" onClick={load} className="font-bold underline">
              Coba lagi
            </button>
          }
        />
      ) : terms.length === 0 ? (
        <EmptyState icon={BookOpen} text="Belum ada istilah. Istilah muncul setelah guru menyimpan modul." />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-600">
          <p className="text-sm font-bold">Tidak ditemukan istilah yang sesuai.</p>
          <p className="mt-1 text-xs text-neutral-400">Coba ubah kata pencarian atau pilih &quot;Semua modul&quot;.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li
              key={`${item.moduleId}:${item.term}`}
              className="flex flex-col justify-between gap-5 rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition-all hover:border-black/25 hover:shadow-md"
            >
              <div>
                <h2 className="text-xl font-black text-neutral-900">{item.term}</h2>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-neutral-600">{item.definition}</p>
              </div>
              <Link
                href={`/tunarungu/kartu/${item.moduleId}`}
                className="group inline-flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-xs font-bold text-neutral-500 hover:text-black"
              >
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Dari modul: {item.moduleTitle}</span>
                <ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
