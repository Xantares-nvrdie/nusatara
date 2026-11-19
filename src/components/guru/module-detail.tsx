'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, FilePlus2, BookX, Pencil } from 'lucide-react'
import { Alert, EmptyState, Skeleton, btnLime, btnSecondary } from '@/components/site/form'
import { ScriptPlayer } from '@/components/module/script-player'
import { VisualSummaryView } from '@/components/module/visual-summary'
import { formatDate } from '@/lib/format'
import { fetchModuleById, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'visual', label: 'Ringkasan visual' },
  { id: 'audio', label: 'Naskah audio' },
  { id: 'asli', label: 'Materi asli' },
] as const

export function ModuleDetail({ id }: { id: string }) {
  const mod = useStore((s) => s.modules.find((m) => m.id === id))
  // Only the author can edit (the API also checks); other teachers' modules stay read-only.
  const isMine = useStore((s) => s.myModuleIds.includes(id))
  // Set by the editor after a successful save.
  const justSaved = useSearchParams().get('disimpan') === '1'
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('visual')
  const [loading, setLoading] = useState(!mod || !mod.blindAudioScript)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!mod || !mod.blindAudioScript) {
      setLoading(true)
      setFailed(false)
      fetchModuleById(id)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    }
  }, [id, mod, attempt])

  if (loading) {
    return <Skeleton className="h-96" />
  }

  if (failed && !mod?.blindAudioScript) {
    return (
      <EmptyState
        icon={BookX}
        text="Tidak bisa memuat modul. Periksa koneksi lalu coba lagi."
        action={
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={btnLime}>
            Coba lagi
          </button>
        }
      />
    )
  }

  if (!mod) {
    return (
      <EmptyState
        icon={BookX}
        text="Modul tidak ditemukan."
        action={
          <Link href="/guru/modul" className={btnLime}>
            Kembali ke daftar modul
          </Link>
        }
      />
    )
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    setTab(TABS[next].id)
    document.getElementById(`tab-${TABS[next].id}`)?.focus()
  }

  return (
    <article data-state="ready">
      <Link href="/guru/modul" className="mb-6 inline-flex items-center gap-2 text-sm font-bold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Semua modul
      </Link>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-balance md:text-4xl">{mod.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {mod.teacherName} · {formatDate(mod.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isMine && (
            <Link href={`/guru/modul/${mod.id}/ubah`} className={btnSecondary}>
              <Pencil className="size-4" aria-hidden="true" /> Edit modul
            </Link>
          )}
          <Link href={`/guru/ujian/baru?modul=${mod.id}`} className={btnLime}>
            <FilePlus2 className="size-4" aria-hidden="true" /> Buat ujian dari modul
          </Link>
        </div>
      </div>

      {justSaved && (
        <Alert tone="success" title="Perubahan modul tersimpan." className="mb-6">
          Siswa melihat versi baru saat membuka modul ini. Ujian yang sudah dibuat dari modul ini tidak ikut berubah.
        </Alert>
      )}

      <div role="tablist" aria-label="Versi materi" className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-border bg-white p-1">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'min-h-11 rounded-full px-5 text-sm font-bold transition-colors',
              tab === t.id ? 'bg-[#111] text-white' : 'hover:bg-muted',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'visual' && <VisualSummaryView data={mod.deafVisualSummary} />}
        {tab === 'audio' && <ScriptPlayer script={mod.blindAudioScript} />}
        {tab === 'asli' && (
          <div className="whitespace-pre-line rounded-2xl border border-border bg-white p-6 leading-relaxed">
            {mod.originalText || mod.rawContent}
          </div>
        )}
      </div>
    </article>
  )
}
