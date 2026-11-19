'use client'

import Link from 'next/link'
import { useMemo, useRef } from 'react'
import { ArrowRight, BookOpen, ClipboardList, FilePlus2, ListChecks, Wand2 } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { btnLime, btnSecondary } from '@/components/site/form'
import { formatDate } from '@/lib/format'
import { useStore } from '@/lib/store'

export function Dashboard() {
  const container = useRef<HTMLDivElement>(null)
  const teacher = useStore((s) => s.teacher)
  const allModules = useStore((s) => s.modules)
  const myIds = useStore((s) => s.myModuleIds)
  const exams = useStore((s) => s.exams)
  // The teacher's own modules (GET /modules/mine), not every public module.
  const modules = useMemo(() => allModules.filter((m) => myIds.includes(m.id)), [allModules, myIds])

  const stats = useMemo(
    () => [
      { label: 'Modul Pembelajaran', value: modules.length, icon: BookOpen },
      { label: 'Ujian Aktif', value: exams.filter((e) => e.status === 'active').length, icon: ClipboardList },
      // Server-side count per exam, so it covers every submission, not only the ones loaded on this device.
      { label: 'Jawaban Terkumpul', value: exams.reduce((acc, e) => acc + (e.submissionCount ?? 0), 0), icon: ListChecks },
    ],
    [modules, exams],
  )

  const recent = useMemo(
    () =>
      [
        ...modules.map((m) => ({ kind: 'Modul', title: m.title, date: m.createdAt, href: `/guru/modul/${m.id}` })),
        ...exams.map((e) => ({ kind: `Ujian · PIN ${e.pin}`, title: e.title, date: e.createdAt, href: '/guru/ujian' })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [modules, exams],
  )

  const isEmpty = modules.length === 0 && exams.length === 0

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.dash-banner', {
        y: 30,
        opacity: 0,
        duration: 0.8,
      })

      tl.from(
        '.dash-stat-card',
        {
          y: 25,
          opacity: 0,
          stagger: 0.12,
          duration: 0.6,
        },
        '-=0.4',
      )

      tl.from(
        '.dash-recent',
        {
          y: 30,
          opacity: 0,
          duration: 0.7,
        },
        '-=0.3',
      )
    },
    { scope: container },
  )

  return (
    <div ref={container} data-state={isEmpty ? 'empty' : 'ready'} className="flex flex-col gap-8">
      {/* Banner */}
      <section className="dash-banner relative overflow-hidden rounded-3xl bg-[#111] p-8 text-white md:p-10 shadow-xl">
        <div aria-hidden="true" className="absolute -right-10 -top-10 size-48 rotate-12 rounded-3xl bg-lime/90 blur-sm" />
        <div aria-hidden="true" className="absolute -bottom-12 right-32 size-24 rotate-6 rounded-2xl bg-white/10" />
        <div className="relative max-w-xl">
          <p className="text-[12px] font-black uppercase tracking-widest text-lime">Portal Guru Inklusif</p>
          <h1 className="mt-3 text-3xl font-black text-balance md:text-4xl">Selamat datang, {teacher?.name}</h1>
          <p className="mt-3 text-white/80 font-medium">
            Tulis materi sekali, biarkan AI Gemini mengubahnya menjadi naskah audio untuk tunanetra dan visual untuk tunarungu.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/guru/modul/baru" className={`${btnLime} shadow-md hover:scale-105 transition-transform`}>
              <Wand2 className="size-4" aria-hidden="true" /> Konversi materi
            </Link>
            <Link
              href="/guru/ujian/baru"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-bold hover:bg-white/10 transition-colors"
            >
              <FilePlus2 className="size-4" aria-hidden="true" /> Buat ujian PIN
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="dash-stat-card flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-lime/30 text-[#111]">
              <s.icon className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-3xl font-black tabular-nums">{s.value}</p>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Recent Activity */}
      <section aria-labelledby="recent-heading" className="dash-recent rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-black tracking-tight">
            Aktivitas Materi & Ujian
          </h2>
          <Link href="/guru/modul" className="text-xs font-black uppercase tracking-wider underline underline-offset-4 hover:text-neutral-600">
            Lihat semua modul
          </Link>
        </div>
        {isEmpty ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="font-semibold text-neutral-600">Mulai dengan mengonversi materi pertama Anda.</p>
            <Link href="/guru/modul/baru" className={btnSecondary}>
              Konversi materi
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recent.map((r) => (
              <li key={r.href + r.title}>
                <Link href={r.href} className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-neutral-50 rounded-xl px-2">
                  <span>
                    <span className="block font-bold text-neutral-900">{r.title}</span>
                    <span className="block text-xs text-neutral-500 font-medium">
                      {r.kind} · {formatDate(r.date)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-black" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
