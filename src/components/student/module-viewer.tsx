'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { EmptyState, Skeleton } from '@/components/site/form'
import { ScriptPlayer } from '@/components/module/script-player'
import { VisualSummaryView } from '@/components/module/visual-summary'
import { LessonNavigator, getChaptersForModule } from '@/components/student/lesson-navigator'
import { fetchModuleById, useHydrated, useStore } from '@/lib/store'

export function ModuleViewer({ id, mode }: { id: string; mode: 'visual' | 'audio' }) {
  const hydrated = useHydrated()
  const mod = useStore((s) => s.modules.find((m) => m.id === id))
  const [loading, setLoading] = useState(!mod || !mod.blindAudioScript)
  const back = mode === 'visual' ? '/tunarungu/kartu' : '/tunanetra'

  useEffect(() => {
    if (!mod || !mod.blindAudioScript) {
      setLoading(true)
      fetchModuleById(id).finally(() => setLoading(false))
    }
  }, [id, mod])

  if (!hydrated || loading) return <Skeleton className="h-96" />
  if (!mod) return <EmptyState icon={FileQuestion} text="Modul tidak ditemukan." action={<Link href={back} className="font-bold underline">Kembali</Link>} />

  const chapters = getChaptersForModule(mod)

  return (
    <article className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3 sm:gap-4">
        <Link
          href={back}
          className="inline-flex w-fit items-center gap-2 rounded-lg text-sm font-bold text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          <span>Semua modul</span>
        </Link>
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground sm:text-sm">
            {mod.teacherName}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
            {mod.title}
          </h1>
        </header>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          {mode === 'visual' ? (
            <VisualSummaryView data={mod.deafVisualSummary} />
          ) : (
            <ScriptPlayer
              script={mod.blindAudioScript}
              moduleId={id}
              moduleTitle={mod.title}
              visualData={mod.deafVisualSummary}
            />
          )}
        </div>
        <aside className="order-first lg:order-last lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8">
          <LessonNavigator
            chapters={chapters}
            moduleTitle={mod.title}
          />
        </aside>
      </div>
    </article>
  )
}
