'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { EmptyState, Skeleton } from '@/components/site/form'
import { ScriptPlayer, type ScriptPlayerHandle } from '@/components/module/script-player'
import { VisualSummaryView } from '@/components/module/visual-summary'
import {
  LessonNavigator,
  getChaptersForModule,
  getChaptersForScript,
  scriptLessonId,
} from '@/components/student/lesson-navigator'
import { fetchModuleById, useHydrated, useStore } from '@/lib/store'

export function ModuleViewer({ id, mode }: { id: string; mode: 'visual' | 'audio' }) {
  const hydrated = useHydrated()
  const mod = useStore((s) => s.modules.find((m) => m.id === id))
  const [loading, setLoading] = useState(!mod || !mod.blindAudioScript)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Audio page: the lesson list is the script's parts and follows the narration.
  const playerRef = useRef<ScriptPlayerHandle>(null)
  const [partIndex, setPartIndex] = useState(0)
  const back = mode === 'visual' ? '/tunarungu/kartu' : '/tunanetra'

  useEffect(() => {
    if (!mod || !mod.blindAudioScript) {
      setLoading(true)
      setFailed(false)
      fetchModuleById(id)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    }
  }, [id, mod, attempt])

  if (!hydrated || loading) return <Skeleton className="h-96" />
  if (failed && !mod?.blindAudioScript) {
    return (
      <EmptyState
        icon={FileQuestion}
        text="Tidak bisa memuat modul. Periksa koneksi lalu coba lagi."
        action={
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-bold underline">
            Coba lagi
          </button>
        }
      />
    )
  }
  if (!mod) return <EmptyState icon={FileQuestion} text="Modul tidak ditemukan." action={<Link href={back} className="font-bold underline">Kembali</Link>} />

  const chapters = mode === 'audio' ? getChaptersForScript(mod.blindAudioScript) : getChaptersForModule(mod)

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
              ref={playerRef}
              script={mod.blindAudioScript}
              moduleId={id}
              moduleTitle={mod.title}
              visualData={mod.deafVisualSummary}
              onPartChange={setPartIndex}
            />
          )}
        </div>
        <aside className="order-first lg:order-last lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8">
          {mode === 'audio' ? (
            <LessonNavigator
              chapters={chapters}
              moduleTitle={mod.title}
              activeLessonId={scriptLessonId(partIndex)}
              onSelectLesson={(lesson) => {
                const index = chapters[0]?.lessons.findIndex((l) => l.id === lesson.id) ?? -1
                if (index >= 0) playerRef.current?.playPart(index)
              }}
            />
          ) : (
            <LessonNavigator chapters={chapters} moduleTitle={mod.title} />
          )}
        </aside>
      </div>
    </article>
  )
}
