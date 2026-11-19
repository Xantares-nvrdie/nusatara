'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Play, Pause, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LessonStatus = 'completed' | 'currently-learning' | 'not-started'

export interface Lesson {
  id: string
  number: string
  title: string
  duration: string
  status: LessonStatus
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
  activeLessonId?: string
  onSelectLesson?: (lesson: Lesson) => void
  moduleTitle?: string
}

export const DEFAULT_TATA_SURYA_CHAPTERS: Chapter[] = [
  {
    id: 'chap-1',
    number: '1.0',
    title: '1.0 Pengenalan & Pusat Tata Surya',
    lessons: [
      {
        id: 'les-1-1',
        number: '1.1',
        title: 'Matahari sebagai Pusat Tata Surya',
        duration: '5 mins',
        status: 'completed',
        targetId: 'section-1',
      },
      {
        id: 'les-1-2',
        number: '1.2',
        title: 'Gaya Gravitasi & Lintasan Orbit',
        duration: '7 mins',
        status: 'completed',
        targetId: 'section-1',
      },
    ],
  },
  {
    id: 'chap-2',
    number: '2.0',
    title: '2.0 Karakteristik & Urutan Planet',
    lessons: [
      {
        id: 'les-2-1',
        number: '2.1',
        title: 'Planet Dalam: Merkurius hingga Mars',
        duration: '10 mins',
        status: 'currently-learning',
        targetId: 'section-2',
      },
      {
        id: 'les-2-2',
        number: '2.2',
        title: 'Planet Luar & Cincin Saturnus',
        duration: '12 mins',
        status: 'not-started',
        targetId: 'section-2',
      },
      {
        id: 'les-2-3',
        number: '2.3',
        title: 'Fakta Menarik Planet & Kehidupan',
        duration: '8 mins',
        status: 'not-started',
        targetId: 'section-3',
      },
    ],
  },
  {
    id: 'chap-3',
    number: '3.0',
    title: '3.0 Peta Konsep & Glosarium',
    lessons: [
      {
        id: 'les-3-1',
        number: '3.1',
        title: 'Eksplorasi Peta Konsep Sistemik',
        duration: '6 mins',
        status: 'not-started',
        targetId: 'peta-konsep',
      },
      {
        id: 'les-3-2',
        number: '3.2',
        title: 'Glosarium Istilah Astronomi',
        duration: '5 mins',
        status: 'not-started',
        targetId: 'glosarium',
      },
    ],
  },
]

export function getChaptersForModule(mod?: { id?: string; title?: string; deafVisualSummary?: { sections?: { title?: string }[] } }): Chapter[] {
  if (!mod || mod.id === 'mod-tata-surya') {
    return DEFAULT_TATA_SURYA_CHAPTERS
  }

  const sections = mod.deafVisualSummary?.sections || []
  return [
    {
      id: 'chap-1',
      number: '1.0',
      title: `1.0 Pengenalan ${mod.title || 'Materi'}`,
      lessons: [
        {
          id: 'les-1-1',
          number: '1.1',
          title: 'Ringkasan Inti & Konsep Dasar',
          duration: '5 mins',
          status: 'completed',
          targetId: 'ringkasan',
        },
      ],
    },
    {
      id: 'chap-2',
      number: '2.0',
      title: '2.0 Pembahasan Utama',
      lessons: sections.map((s, idx) => ({
        id: `les-2-${idx + 1}`,
        number: `2.${idx + 1}`,
        title: s.title || `Bagian ${idx + 1}`,
        duration: `${(idx + 1) * 3 + 4} mins`,
        status: (idx === 0 ? 'currently-learning' : 'not-started') as LessonStatus,
        targetId: `section-${idx + 1}`,
      })),
    },
    {
      id: 'chap-3',
      number: '3.0',
      title: '3.0 Rangkuman & Glosarium',
      lessons: [
        {
          id: 'les-3-1',
          number: '3.1',
          title: 'Peta Konsep Visual',
          duration: '6 mins',
          status: 'not-started',
          targetId: 'peta-konsep',
        },
        {
          id: 'les-3-2',
          number: '3.2',
          title: 'Glosarium Istilah',
          duration: '4 mins',
          status: 'not-started',
          targetId: 'glosarium',
        },
      ],
    },
  ]
}

export function LessonNavigator({
  chapters: initialChapters,
  activeLessonId: initialActiveId,
  onSelectLesson,
}: LessonNavigatorProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters || DEFAULT_TATA_SURYA_CHAPTERS)
  const [activeId, setActiveId] = useState<string>(
    initialActiveId ||
      initialChapters?.[0]?.lessons?.[0]?.id ||
      'les-2-1',
  )
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  // Calculate statistics
  const allLessons = chapters.flatMap((c) => c.lessons)
  const totalLessons = allLessons.length
  const completedLessons = allLessons.filter((l) => l.status === 'completed').length
  const activeLesson = allLessons.find((l) => l.id === activeId) || allLessons[0]

  const handleLessonClick = (clickedLesson: Lesson) => {
    setActiveId(clickedLesson.id)

    // Update statuses: active lesson becomes currently-learning
    setChapters((prev) =>
      prev.map((ch) => ({
        ...ch,
        lessons: ch.lessons.map((l) => {
          if (l.id === clickedLesson.id) {
            return { ...l, status: 'currently-learning' }
          }
          return l
        }),
      })),
    )

    if (onSelectLesson) {
      onSelectLesson(clickedLesson)
    }

    // Scroll to target element smoothly if available
    if (clickedLesson.targetId) {
      const el = document.getElementById(clickedLesson.targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const renderStatusIcon = (status: LessonStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs"
            title="Completed"
          >
            <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
          </span>
        )
      case 'currently-learning':
        return (
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-xs"
            title="Currently Learning"
          >
            <Pause className="size-3 fill-current" aria-hidden="true" />
          </span>
        )
      case 'not-started':
      default:
        return (
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-400"
            title="Not Started"
          >
            <Play className="size-2.5 translate-x-0.5 fill-current" aria-hidden="true" />
          </span>
        )
    }
  }

  return (
    <nav
      aria-label="Lesson Navigator"
      className="flex flex-col rounded-2xl border border-border bg-white shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime">
            <Compass className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
              Lesson Navigator
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              {completedLessons} dari {totalLessons} pelajaran selesai
            </p>
          </div>
        </div>

        {/* Mobile toggle button */}
        <button
          type="button"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-neutral-100 lg:hidden"
          aria-expanded={isMobileExpanded}
        >
          <span>{isMobileExpanded ? 'Tutup' : 'Lihat'}</span>
          {isMobileExpanded ? (
            <ChevronUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Active Lesson Bar on Mobile (when collapsed) */}
      <div className="flex items-center justify-between bg-purple-50/70 px-4 py-2.5 text-xs font-medium text-purple-950 lg:hidden border-b border-purple-100">
        <span className="flex items-center gap-2 truncate">
          <span className="size-2 rounded-full bg-[#7c3aed] animate-pulse" />
          <span className="font-bold truncate">Aktif: {activeLesson.title}</span>
        </span>
        <span className="shrink-0 font-semibold text-purple-700 ml-2">{activeLesson.duration}</span>
      </div>

      {/* Chapter & Lesson List */}
      <div
        className={cn(
          'flex flex-col gap-6 p-4 sm:p-5',
          !isMobileExpanded && 'hidden lg:flex',
        )}
      >
        {chapters.map((chapter) => (
          <section key={chapter.id} aria-label={chapter.title} className="flex flex-col gap-2.5">
            {/* Chapter Header */}
            <div className="px-1 text-xs font-black uppercase tracking-wider text-muted-foreground sm:text-sm">
              <span className="text-foreground">{chapter.title}</span>
            </div>

            {/* Vertical Lesson List */}
            <ul className="flex flex-col gap-1.5">
              {chapter.lessons.map((lesson) => {
                const isActive = lesson.id === activeId

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => handleLessonClick(lesson)}
                      className={cn(
                        'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all sm:px-3.5 sm:py-3',
                        isActive
                          ? 'bg-purple-50/90 text-purple-950 shadow-xs ring-1 ring-purple-200'
                          : 'text-foreground hover:bg-neutral-100/80',
                      )}
                    >
                      {/* Left: Status Icon & Title */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {renderStatusIcon(lesson.status)}
                        <span
                          className={cn(
                            'truncate text-xs sm:text-sm',
                            isActive ? 'font-extrabold text-purple-950' : 'font-semibold text-foreground/90',
                          )}
                        >
                          <span className="mr-1 text-muted-foreground">{lesson.number}</span>
                          {lesson.title}
                        </span>
                      </div>

                      {/* Right: Duration (Right-aligned) */}
                      <span
                        className={cn(
                          'shrink-0 text-right text-xs font-bold transition-colors ml-2',
                          isActive ? 'text-purple-700' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      >
                        {lesson.duration}
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
