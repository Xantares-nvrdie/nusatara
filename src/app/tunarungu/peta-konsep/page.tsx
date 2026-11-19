'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  Network,
  RotateCcw,
} from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'
import { api, ApiError } from '@/lib/api'

/** Item of GET /api/modules/concept-maps: one map per module, with a single level of branches. */
interface ConceptMapItem {
  moduleId: string
  moduleTitle: string
  conceptMap: {
    central: string
    branches: { label: string; children: string[] }[]
  }
}

type LoadStatus = 'loading' | 'error' | 'empty' | 'ready'
/** 'root' is the central concept; a number is the index of a branch. */
type Selection = 'root' | number

const focusRing = 'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black'

function loadErrorMessage(err: unknown) {
  // api() throws ApiError with the HTTP status; a request that never reached the server has no status.
  if (err instanceof ApiError && err.status !== undefined) return `Peta konsep gagal dimuat. ${err.message}`
  return 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.'
}

export default function PetaKonsepPage() {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [maps, setMaps] = useState<ConceptMapItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [selected, setSelected] = useState<Selection>('root')
  const [collapsed, setCollapsed] = useState<number[]>([])

  // Bumped on every load and on unmount, so a late response never replaces a newer one.
  const requestRef = useRef(0)

  const loadMaps = useCallback(async () => {
    requestRef.current += 1
    const requestId = requestRef.current
    setStatus('loading')
    try {
      const { items } = await api<{ items: ConceptMapItem[] }>('/modules/concept-maps')
      if (requestId !== requestRef.current) return
      setMaps(items)
      setActiveIdx(0)
      setSelected('root')
      setCollapsed([])
      setStatus(items.length > 0 ? 'ready' : 'empty')
    } catch (err) {
      if (requestId !== requestRef.current) return
      setErrorMsg(loadErrorMessage(err))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadMaps()
    return () => {
      requestRef.current += 1
    }
  }, [loadMaps])

  const active = status === 'ready' ? maps[activeIdx] : undefined
  const branches = active?.conceptMap.branches ?? []
  const selectedBranch = typeof selected === 'number' ? branches[selected] : undefined
  const detailItems = selectedBranch ? selectedBranch.children : branches.map((b) => b.label)

  function chooseMap(i: number) {
    setActiveIdx(i)
    setSelected('root')
    setCollapsed([])
  }

  function selectBranch(i: number) {
    setSelected(i)
    setCollapsed((prev) => prev.filter((x) => x !== i))
  }

  function toggleBranch(i: number) {
    setCollapsed((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
  }

  return (
    <StudentShell>
      <div className="space-y-8">
        {/* Banner */}
        <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
              <Network className="size-3.5" />
              Eksplorasi Konsep Bertingkat
            </span>
            <span className="text-xs text-white/70">100% Visual & Diagrammatic</span>
          </div>
          <h1 className="text-2xl font-black md:text-4xl">Peta Konsep Interaktif</h1>
          <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Pahami materi pelajaran melalui diagram yang jelas. Pilih materi, lalu klik cabang konsep untuk melihat rinciannya.
          </p>

          {/* Module Pills: one concept map per module */}
          {status === 'ready' && (
            <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {maps.map((m, i) => (
                <button
                  key={m.moduleId}
                  type="button"
                  aria-pressed={activeIdx === i}
                  onClick={() => chooseMap(i)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-lime ${
                    activeIdx === i
                      ? 'bg-lime text-black font-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {m.moduleTitle}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'loading' && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-3xl border border-black/10 bg-white p-10 text-neutral-700 shadow-sm"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <p className="text-sm font-bold">Memuat peta konsep…</p>
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-10 text-center"
          >
            <AlertCircle className="size-8 text-red-600" aria-hidden="true" />
            <p className="max-w-xl text-sm font-bold text-red-950">{errorMsg}</p>
            <button type="button" onClick={() => void loadMaps()} className={`${btnLime} px-7 py-3 text-sm`}>
              <RotateCcw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        )}

        {status === 'empty' && (
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-14 text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-white">
              <Network className="size-6 text-neutral-700" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold text-neutral-700">
              Belum ada peta konsep. Peta konsep muncul setelah guru menyimpan modul.
            </p>
          </div>
        )}

        {/* Interactive Mindmap Layout: Left Tree + Right Detail */}
        {active && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* Tree View Canvas */}
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-neutral-100 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Layers className="size-4" aria-hidden="true" /> Pohon Relasi Konsep
                </span>
                <span className="text-xs text-neutral-500">Klik node untuk melihat detail</span>
              </div>

              <h2 className="mb-4 text-base font-black text-neutral-900">{active.moduleTitle}</h2>

              {/* Tree nodes renderer */}
              <div className="space-y-6">
                {/* Root Node */}
                <button
                  type="button"
                  aria-pressed={selected === 'root'}
                  onClick={() => setSelected('root')}
                  className={`block w-full cursor-pointer rounded-2xl border-2 p-4 text-left transition-all ${focusRing} ${
                    selected === 'root'
                      ? 'border-black bg-lime/10 shadow-md scale-[1.02]'
                      : 'border-neutral-200 bg-neutral-50 hover:border-black'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-black uppercase text-lime">
                      Konsep Utama
                    </span>
                    <ChevronRight className="size-4 text-neutral-400" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-lg font-black text-neutral-900">{active.conceptMap.central}</span>
                  <span className="mt-1 block text-xs text-neutral-600">{branches.length} cabang konsep</span>
                </button>

                {/* Branches (level 1), each with its details (level 2) */}
                <ul className="ml-6 pl-6 border-l-2 border-dashed border-neutral-300 space-y-4">
                  {branches.map((branch, i) => {
                    const isSelected = selected === i
                    const isOpen = !collapsed.includes(i)
                    const hasChildren = branch.children.length > 0
                    const childrenId = `branch-${activeIdx}-${i}`
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: branches are fixed per map; position is the identity
                      <li key={i} className="space-y-3">
                        <div
                          className={`flex items-stretch rounded-2xl border-2 transition-all ${
                            isSelected
                              ? 'border-black bg-lime/10 shadow-md scale-[1.02]'
                              : 'border-neutral-200 bg-white hover:border-neutral-400'
                          }`}
                        >
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => selectBranch(i)}
                            className={`min-w-0 flex-1 cursor-pointer rounded-2xl p-3.5 text-left ${focusRing}`}
                          >
                            <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[10px] font-bold text-neutral-800">
                              Cabang {i + 1}
                            </span>
                            <span className="mt-1.5 block text-base font-extrabold text-neutral-900">{branch.label}</span>
                            <span className="mt-0.5 block text-xs text-neutral-600">
                              {hasChildren ? `${branch.children.length} rincian` : 'Belum ada rincian'}
                            </span>
                          </button>
                          {hasChildren && (
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={childrenId}
                              aria-label={`${isOpen ? 'Sembunyikan' : 'Tampilkan'} rincian ${branch.label}`}
                              onClick={() => toggleBranch(i)}
                              className={`flex w-12 shrink-0 cursor-pointer items-center justify-center rounded-r-2xl text-neutral-500 hover:bg-neutral-100 hover:text-black ${focusRing}`}
                            >
                              <ChevronDown
                                className={`size-4 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </div>

                        {hasChildren && (
                          <ul
                            id={childrenId}
                            hidden={!isOpen}
                            className="ml-6 pl-6 border-l-2 border-dashed border-neutral-300 space-y-2"
                          >
                            {branch.children.map((child, j) => (
                              <li
                                // biome-ignore lint/suspicious/noArrayIndexKey: details are fixed per branch; position is the identity
                                key={j}
                                className="rounded-xl border-2 border-neutral-200 bg-neutral-50 p-3 text-sm font-bold text-neutral-900"
                              >
                                {child}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            {/* Right Detail Panel */}
            <div className="rounded-3xl border border-black/10 bg-[#111] p-6 text-white shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-lime px-3 py-0.5 text-xs font-black uppercase text-black">
                    {selectedBranch ? 'Cabang Konsep' : 'Konsep Utama'}
                  </span>
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Eye className="size-3.5" aria-hidden="true" /> Pratinjau Terpilih
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {selectedBranch ? selectedBranch.label : active.conceptMap.central}
                  </h3>
                  <p className="mt-3 text-sm text-neutral-300 leading-relaxed font-medium">
                    {selectedBranch
                      ? `Bagian dari konsep utama "${active.conceptMap.central}".`
                      : `Konsep utama dari materi "${active.moduleTitle}".`}
                  </p>
                </div>

                {/* Branch labels (root selected) or the branch's details */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2.5">
                  <span className="text-xs font-bold text-lime uppercase tracking-wider block">
                    {selectedBranch ? 'Rincian:' : 'Cabang Konsep:'}
                  </span>
                  {detailItems.length > 0 ? (
                    <ul className="space-y-2">
                      {detailItems.map((item, idx) => (
                        <li
                          // biome-ignore lint/suspicious/noArrayIndexKey: items are fixed per selection; position is the identity
                          key={idx}
                          className="flex items-center gap-2 text-xs font-medium text-neutral-200"
                        >
                          <CheckCircle2 className="size-3.5 shrink-0 text-lime" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-neutral-400">Belum ada rincian untuk cabang ini.</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 mt-6 flex gap-3">
                <Link
                  href={`/tunarungu/kartu/${active.moduleId}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-center text-xs font-bold text-black hover:bg-lime transition-all"
                >
                  <BookOpen className="size-4" aria-hidden="true" /> Buka materi
                </Link>
                <Link
                  href="/tunarungu/ujian"
                  className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-xs font-bold text-white hover:bg-white/20 transition-all"
                >
                  Mulai Ujian (PIN)
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentShell>
  )
}
