'use client'

import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/guru/guru-shell'
import { EmptyState, inputClass } from '@/components/site/form'
import { formatDate } from '@/lib/format'
import { examStats, useStore } from '@/lib/store'

export function Grades({ initialExamId }: { initialExamId?: string }) {
  const exams = useStore((s) => s.exams)
  const submissions = useStore((s) => s.submissions)
  const [examId, setExamId] = useState(initialExamId ?? exams[0]?.id ?? '')

  useEffect(() => {
    if (!examId && exams.length > 0) {
      setExamId(initialExamId ?? exams[0].id)
    }
  }, [exams, examId, initialExamId])

  const exam = exams.find((e) => e.id === examId)
  const rows = submissions.filter((s) => s.examId === examId)
  const st = examStats(examId, submissions)

  return (
    <div data-state={rows.length ? 'ready' : 'empty'}>
      <PageHeader title="Nilai siswa" description="Skor dihitung otomatis saat siswa mengirim jawaban." />
      {exams.length === 0 ? (
        <EmptyState icon={BarChart3} text="Belum ada ujian." />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-2 sm:w-96">
              <label htmlFor="pilih-ujian" className="text-sm font-bold">
                Pilih ujian
              </label>
              <select id="pilih-ujian" value={examId} onChange={(e) => setExamId(e.target.value)} className={inputClass}>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} (PIN {e.pin})
                  </option>
                ))}
              </select>
            </div>
            <dl className="flex gap-3">
              <div className="rounded-2xl bg-[#111] px-5 py-3 text-white">
                <dt className="text-xs font-bold uppercase tracking-widest text-lime">Pengumpulan</dt>
                <dd className="text-2xl font-black">{st.count}</dd>
              </div>
              <div className="rounded-2xl bg-lime px-5 py-3 text-lime-foreground">
                <dt className="text-xs font-bold uppercase tracking-widest">Rata-rata</dt>
                <dd className="text-2xl font-black">{st.averageScore ?? '–'}</dd>
              </div>
            </dl>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={BarChart3} text="Belum ada siswa yang mengirim jawaban." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Nilai untuk {exam?.title}</caption>
                <thead className="border-b border-border bg-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-bold">Nama siswa</th>
                    <th scope="col" className="px-5 py-3 font-bold">Benar</th>
                    <th scope="col" className="px-5 py-3 font-bold">Dijawab</th>
                    <th scope="col" className="px-5 py-3 font-bold">Skor</th>
                    <th scope="col" className="px-5 py-3 font-bold">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <th scope="row" className="px-5 py-4 font-semibold">{r.studentName}</th>
                      <td className="px-5 py-4">{r.correctCount}/{r.totalQuestions}</td>
                      <td className="px-5 py-4">{r.answeredCount}/{r.totalQuestions}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 font-black ${r.score >= 70 ? 'bg-lime' : 'bg-muted'}`}>{r.score}</span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
