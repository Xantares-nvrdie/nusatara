'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Eye, Headphones, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useHydrated, useStore } from '@/lib/store'

type Item = { id: string; title: string; teacherName: string; summary?: string }

/** Same limit as the API's `q` (learning-modules/model.ts). */
const MAX_QUERY = 100
/** Modules shown before the student types anything. */
const PREVIEW_COUNT = 6
/** Wait for a pause in typing before asking the server, to save data on slow connections. */
const DEBOUNCE_MS = 300

const matches = (title: string, query: string) => title.toLowerCase().includes(query.toLowerCase())

/**
 * Public module search for the home page ("Cari Modul" in the navbar). No login: each result opens the audio
 * version (tunanetra) or the visual cards (tunarungu). Searches every module on the server by title; while the
 * server answers, or when it can't be reached, it filters the module list already on the device.
 */
export function ModuleSearch() {
  const hydrated = useHydrated()
  const cached = useStore((s) => s.modules)
  const [input, setInput] = useState('')
  const [remote, setRemote] = useState<{ query: string; items: Item[] } | null>(null)
  const [offline, setOffline] = useState(false)
  const requestRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const query = input.trim()

  useEffect(() => {
    // Every new query (or clearing it) makes older responses stale.
    const request = ++requestRef.current
    setOffline(false)
    if (!query) return
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ items: Item[] }>(`/modules?pageSize=50&q=${encodeURIComponent(query)}`)
        if (request === requestRef.current) setRemote({ query, items: res.items ?? [] })
      } catch {
        if (request === requestRef.current) setOffline(true)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const local = useMemo(() => (query ? cached.filter((m) => matches(m.title, query)) : cached), [cached, query])
  const serverItems = query && remote?.query === query ? remote.items : null
  const items: Item[] = serverItems ?? (query ? local : local.slice(0, PREVIEW_COUNT))
  const searching = query !== '' && !serverItems && !offline

  const status = !query
    ? ''
    : searching
      ? 'Mencari…'
      : items.length
        ? `${items.length} modul ditemukan untuk “${query}”.`
        : `Tidak ada modul dengan judul “${query}”.`

  return (
    <section id="cari-modul" aria-labelledby="cari-modul-heading" className="relative z-10 scroll-mt-6 px-6 pb-16 lg:px-12">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-black/10 bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.06)] sm:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <h2 id="cari-modul-heading" className="text-2xl font-black tracking-tight text-[#111] sm:text-3xl">
            Cari modul
          </h2>
          <p className="max-w-2xl text-sm font-medium text-neutral-600">
            Semua modul dari guru, tanpa perlu masuk. Pilih <strong>Dengarkan</strong> untuk versi suara, atau{' '}
            <strong>Kartu visual</strong> untuk ringkasan bergambar.
          </p>
        </div>

        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <label htmlFor="cari-modul-input" className="sr-only">
            Cari judul modul
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            ref={inputRef}
            id="cari-modul-input"
            type="search"
            value={input}
            maxLength={MAX_QUERY}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Cari judul modul…"
            autoComplete="off"
            className="min-h-14 w-full rounded-2xl border-2 border-neutral-200 bg-white py-3 pl-12 pr-12 text-base font-semibold text-[#111] placeholder:font-medium placeholder:text-neutral-400 focus:border-[#111] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput('')
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-[#111]"
              aria-label="Hapus pencarian"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </form>

        <div className="mt-4 min-h-5 text-sm font-semibold text-neutral-600">
          <p role="status">{status}</p>
          {offline && (
            <p className="mt-1 text-xs font-medium text-neutral-500">
              Tidak bisa terhubung ke server. Hasil di atas hanya dari modul yang sudah tersimpan di perangkat ini.
            </p>
          )}
          {!query && hydrated && items.length > 0 && (
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Modul terbaru</p>
          )}
        </div>

        {!hydrated ? (
          <div aria-hidden="true" className="mt-4 h-40 animate-pulse rounded-3xl bg-neutral-100" />
        ) : items.length === 0 ? (
          !query && (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-neutral-300 px-6 py-10 text-center">
              <BookOpen className="size-6 text-neutral-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-neutral-600">Belum ada modul dari guru.</p>
            </div>
          )
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-neutral-50 p-5">
                <h3 className="text-lg font-black leading-snug text-[#111]">{m.title}</h3>
                {m.summary && <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600">{m.summary}</p>}
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">{m.teacherName}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/tunanetra/modul/${m.id}`}
                    aria-label={`Dengarkan: ${m.title}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111] px-4 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
                  >
                    <Headphones className="size-4" aria-hidden="true" /> Dengarkan
                  </Link>
                  <Link
                    href={`/tunarungu/kartu/${m.id}`}
                    aria-label={`Kartu visual: ${m.title}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-4 text-sm font-bold text-[#111] transition-transform hover:scale-[1.03]"
                  >
                    <Eye className="size-4" aria-hidden="true" /> Kartu visual
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
