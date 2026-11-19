'use client'

import { useId, useState } from 'react'
import { ChevronDown, ChevronUp, Compass } from 'lucide-react'
import { buildModuleLessons, type ModuleLesson } from '@/lib/module-lessons'
import type { LearningModule } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface Lesson {
  id: string
  number: string
  title: string
  /** Id of the element on the page to scroll to, when the page renders one for this lesson. */
  targetId?: string
}

export interface Chapter {
  id: string
  number: string
  title: string
  lessons: Lesson[]
}

interface LessonNavigatorProps {
  chapters?: Chapter[]
  /** Lesson highlighted at first; defaults to the first lesson. */
  activeLessonId?: string
  onSelectLesson?: (lesson: Lesson) => void
  moduleTitle?: string
}

/** Element ids that VisualSummaryView renders for each kind of lesson. */
function targetIdFor(lesson: ModuleLesson) {
  switch (lesson.content.kind) {
    case 'points':
      return lesson.id.replace('bagian-', 'section-')
    case 'concept-map':
      return 'peta-konsep'
    case 'glossary':
      return 'glosarium'
    default:
      return undefined
  }
}

/** Navigator chapters for a module, from its visual summary only. Empty when there is no module. */
export function getChaptersForModule(mod?: Pick<LearningModule, 'title' | 'deafVisualSummary'>): Chapter[] {
  if (!mod) return []
  return buildModuleLessons(mod).map((chapter) => ({
    id: chapter.id,
    number: String(chapter.number),
    title: `Bab ${chapter.number} · ${chapter.title}`,
    lessons: chapter.lessons.map((lesson) => ({
      id: lesson.id,
      number: lesson.number,
      title: lesson.title,
      targetId: targetIdFor(lesson),
    })),
  }))
}

export function LessonNavigator({ chapters = [], activeLessonId, onSelectLesson, moduleTitle }: LessonNavigatorProps) {
  const [selectedId, setSelectedId] = useState(activeLessonId)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const listId = useId()

  const visibleChapters = chapters.filter((c) => c.lessons.length > 0)
  const allLessons = visibleChapters.flatMap((c) => c.lessons)
  if (allLessons.length === 0) return null

  const activeLesson = allLessons.find((l) => l.id === selectedId) ?? allLessons[0]

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedId(lesson.id)
    onSelectLesson?.(lesson)

    if (lesson.targetId) {
      document.getElementById(lesson.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav
      aria-label={moduleTitle ? `Daftar pelajaran: ${moduleTitle}` : 'Daftar pelajaran'}
      className="flex flex-col rounded-2xl border border-border bg-white shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime">
            <Compass className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">Daftar pelajaran</h2>
            <p className="text-xs font-medium text-muted-foreground">
              {allLessons.length} pelajaran dalam {visibleChapters.length} bab
            </p>
          </div>
        </div>

        {/* Mobile toggle button */}
        <button
          type="button"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-neutral-100 lg:hidden"
          aria-expanded={isMobileExpanded}
          aria-controls={listId}
        >
          <span>{isMobileExpanded ? 'Tutup' : 'Lihat'}</span>
          {isMobileExpanded ? (
            <ChevronUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Active lesson bar on mobile (when collapsed) */}
      <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50/70 px-4 py-2.5 text-xs font-medium text-purple-950 lg:hidden">
        <span className="flex items-center gap-2 truncate">
          <span className="size-2 rounded-full bg-[#7c3aed]" aria-hidden="true" />
          <span className="truncate font-bold">Aktif: {activeLesson.title}</span>
        </span>
        <span className="ml-2 shrink-0 font-semibold text-purple-700">{activeLesson.number}</span>
      </div>

      {/* Chapter & lesson list */}
      <div id={listId} className={cn('flex flex-col gap-6 p-4 sm:p-5', !isMobileExpanded && 'hidden lg:flex')}>
        {visibleChapters.map((chapter) => (
          <section key={chapter.id} className="flex flex-col gap-2.5">
            <h3 className="px-1 text-xs font-black uppercase tracking-wider text-foreground sm:text-sm">
              {chapter.title}
            </h3>

            <ul className="flex flex-col gap-1.5">
              {chapter.lessons.map((lesson) => {
                const isActive = lesson.id === activeLesson.id

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => handleLessonClick(lesson)}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all sm:px-3.5 sm:py-3',
                        isActive
                          ? 'bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-200'
                          : 'text-foreground hover:bg-neutral-100/80',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                          isActive ? 'border-[#7c3aed] bg-[#7c3aed]' : 'border-neutral-300',
                        )}
                      >
                        <span className={cn('size-2 rounded-full', isActive ? 'bg-white' : 'bg-neutral-300')} />
                      </span>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-xs sm:text-sm',
                          isActive ? 'font-extrabold text-purple-950' : 'font-semibold text-foreground/90',
                        )}
                      >
                        <span className="mr-1 text-muted-foreground">{lesson.number}</span>
                        {lesson.title}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}
