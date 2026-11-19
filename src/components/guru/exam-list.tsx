'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BarChart3, ClipboardList, FilePlus2 } from 'lucide-react'
import { PageHeader } from '@/components/guru/guru-shell'
import { Alert, EmptyState, btnLime, btnSecondary } from '@/components/site/form'
import { formatDate } from '@/lib/format'
import { examStats, setExamStatus, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ExamList() {
  const exams = useStore((s) => s.exams)
  const submissions = useStore((s) => s.submissions)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function toggle(id: string, status: 'active' | 'closed') {
    setPending(id)
    setError('')
    try {
      await setExamStatus(id, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div data-state={exams.length ? 'ready' : 'empty'}>
      <PageHeader
        title="Ujian"
        description="Bagikan PIN 4 digit ke siswa. Tutup ujian saat waktu habis."
        action={
          <Link href="/guru/ujian/baru" className={btnLime}>
            <FilePlus2 className="size-4" aria-hidden="true" /> Buat ujian
          </Link>
        }
      />
      {error && <Alert title="Status tidak berubah" className="mb-6">{error}</Alert>}
      {exams.length === 0 ? (
        <EmptyState icon={ClipboardList} text="Belum ada ujian." action={<Link href="/guru/ujian/baru" className={btnLime}>Buat ujian</Link>} />
      ) : (
        <ul className="flex flex-col gap-4">
          {exams.map((e) => {
            const st = examStats(e.id, submissions)
            const active = e.status === 'active'
            return (
              <li key={e.id} className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6 md:flex-row md:items-center">
                <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-[#111] px-6 py-4 text-white">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-lime">PIN</span>
                  <span className="font-mono text-3xl font-black tracking-[0.2em]" aria-label={`PIN ${e.pin.split('').join(' ')}`}>
                    {e.pin}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold">{e.title}</h2>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold',
                        active ? 'bg-lime text-lime-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {active ? 'Aktif' : 'Ditutup'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {e.questionCount ?? e.questions.length} soal · {st.count} pengumpulan
                    {st.averageScore !== null && ` · rata-rata ${st.averageScore}`} · {formatDate(e.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/guru/nilai?ujian=${e.id}`} className={btnSecondary}>
                    <BarChart3 className="size-4" aria-hidden="true" /> Nilai
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(e.id, active ? 'closed' : 'active')}
                    disabled={pending === e.id}
                    className={active ? btnSecondary : btnLime}
                  >
                    {pending === e.id ? 'Menyimpan…' : active ? 'Tutup ujian' : 'Buka lagi'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
