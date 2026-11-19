'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Eye,
  GraduationCap,
  RotateCw,
  Search,
  WifiOff,
  X,
} from 'lucide-react'
import { EmptyState, Skeleton } from '@/components/site/form'
import { buildModuleLessons, type ModuleChapter, type ModuleLesson } from '@/lib/module-lessons'
import { fetchModuleById, useHydrated, useStore } from '@/lib/store'
import type { LearningModule } from '@/lib/types'
import { cn } from '@/lib/utils'

const BACK_HREF = '/tunarungu/kartu'
const EXAM_HREF = '/tunarungu/ujian'

type LoadResult =
  | { key: string; status: 'ready'; module: LearningModule }
  | { key: string; status: 'not-found' | 'error' }

export function CoursePlayer({ id }: { id: string }) {
  const hydrated = useHydrated()
  // Cached copy. A list item has no deafVisualSummary until GET /modules/:id has returned.
  const cached = useStore((s) => s.modules.find((m) => m.id === id))
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const requestKey = `${id}#${attempt}`

  useEffect(() => {
    let cancelled = false
    fetchModuleById(id)
      .then((full) => {
        if (cancelled) return
        setResult(full ? { key: requestKey, status: 'ready', module: full } : { key: requestKey, status: 'not-found' })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [id, requestKey])

  // Results of an older request (other id or before a retry) don't count.
  const current = result?.key === requestKey ? result : null
  // The store copy first: it picks up a teacher's edit when an old cached copy is refreshed in the background.
  // Keep the fetched module if a later list sync drops it from the store.
  const mod = cached?.deafVisualSummary ? cached : current?.status === 'ready' ? current.module : undefined

  if (!hydrated) return <PlayerSkeleton />
  if (mod) return <PlayerView key={mod.id} mod={mod} />
  if (!current) return <PlayerSkeleton />

  if (current.status === 'error') {
    return (
      <CenteredState>
        <div role="alert">
          <EmptyState
            icon={WifiOff}
            text="Tidak bisa memuat modul. Periksa koneksi lalu coba lagi."
            action={
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2.5 text-sm font-black text-lime transition-colors hover:bg-neutral-800"
                >
                  <RotateCw className="size-4" aria-hidden="true" />
                  <span>Coba lagi</span>
                </button>
                <BackToList />
              </div>
            }
          />
        </div>
      </CenteredState>
    )
  }

  return (
    <CenteredState>
      <EmptyState icon={BookOpen} text="Modul pembelajaran tidak ditemukan." action={<BackToList />} />
    </CenteredState>
  )
}

function CenteredState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  )
}

function BackToList() {
  return (
    <Link href={BACK_HREF} className="font-bold text-foreground underline">
      Kembali ke daftar modul
    </Link>
  )
}

function PlayerSkeleton() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
      <output className="sr-only">Memuat modul…</output>
      <Skeleton className="h-96 w-full max-w-4xl rounded-3xl" />
    </div>
  )
}

function PlayerView({ mod }: { mod: LearningModule }) {
  const chapters = useMemo(() => buildModuleLessons(mod), [mod])
  const lessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters])

  const [activeLessonId, setActiveLessonId] = useState(() => lessons[0]?.id ?? '')
  // Lessons opened during this visit only. Nothing is saved.
  const [openedIds, setOpenedIds] = useState<string[]>(() => (lessons[0] ? [lessons[0].id] : []))
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({})
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const mainRef = useRef<HTMLElement>(null)
  const sidebarToggleRef = useRef<HTMLButtonElement>(null)
  const sidebarCloseRef = useRef<HTMLButtonElement>(null)

  // Mobile drawer: focus moves into it when opened; Escape closes it and returns focus to the toggle.
  useEffect(() => {
    if (!isMobileSidebarOpen) return
    sidebarCloseRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setIsMobileSidebarOpen(false)
      sidebarToggleRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobileSidebarOpen])

  const query = searchQuery.trim().toLowerCase()
  const filteredChapters = useMemo((): { chapter: ModuleChapter; lessons: ModuleLesson[] }[] => {
    if (!query) return chapters.map((chapter) => ({ chapter, lessons: chapter.lessons }))
    return chapters.flatMap((chapter) => {
      if (chapter.title.toLowerCase().includes(query)) return [{ chapter, lessons: chapter.lessons }]
      const matches = chapter.lessons.filter((l) => l.title.toLowerCase().includes(query) || l.number.includes(query))
      return matches.length > 0 ? [{ chapter, lessons: matches }] : []
    })
  }, [chapters, query])

  if (lessons.length === 0) {
    return (
      <CenteredState>
        <EmptyState icon={BookOpen} text="Modul ini belum memiliki materi visual." action={<BackToList />} />
      </CenteredState>
    )
  }

  const activeIndex = Math.max(
    0,
    lessons.findIndex((l) => l.id === activeLessonId),
  )
  const activeLesson = lessons[activeIndex]
  const isLastLesson = activeIndex === lessons.length - 1
  const openedCount = openedIds.length
  const progressLabel = `${openedCount} dari ${lessons.length} pelajaran dibuka`
  const progressPercent = Math.round((openedCount / lessons.length) * 100)

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
    setOpenedIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]))
    setIsMobileSidebarOpen(false)
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleChapter = (chapterId: string) => {
    setCollapsedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }))
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Top bar */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-3 shadow-2xs sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={BACK_HREF}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground sm:text-sm"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">Semua Modul</span>
          </Link>

          <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden="true" />

          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime shadow-xs">
              <GraduationCap className="size-4.5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                Oleh {mod.teacherName}
              </span>
              <h1 className="max-w-[200px] truncate text-xs font-black tracking-tight text-foreground sm:max-w-md sm:text-sm lg:max-w-lg">
                {mod.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {/* Session-only progress: which lessons were opened in this visit */}
          <div className="hidden items-center gap-3 sm:flex">
            <div
              role="progressbar"
              aria-label="Pelajaran yang sudah dibuka"
              aria-valuemin={0}
              aria-valuemax={lessons.length}
              aria-valuenow={openedCount}
              aria-valuetext={progressLabel}
              className="h-2 w-24 overflow-hidden rounded-full border border-border/80 bg-neutral-100 sm:w-32"
            >
              <div
                className="h-full rounded-full bg-lime transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-extrabold text-foreground" aria-hidden="true">
              {progressLabel}
            </span>
          </div>

          <button
            ref={sidebarToggleRef}
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-neutral-200 lg:hidden"
            aria-expanded={isMobileSidebarOpen}
            aria-controls="course-sidebar"
          >
            <Compass className="size-4 text-[#7c3aed]" aria-hidden="true" />
            <span>Daftar isi</span>
          </button>

          <Link
            href={BACK_HREF}
            className="hidden size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground sm:flex"
            aria-label="Keluar dari ruang belajar"
            title="Keluar dari ruang belajar"
          >
            <X className="size-4.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Reading area */}
        <main ref={mainRef} className="flex flex-1 flex-col overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-6 sm:px-8 sm:py-10 md:py-12">
            <div className="flex flex-col gap-2.5 border-b border-border/80 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="text-foreground">Bab {activeLesson.chapterNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{activeLesson.chapterTitle}</span>
                <span aria-hidden="true">·</span>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 font-extrabold text-purple-700">
                  Pelajaran {activeLesson.number}
                </span>
              </div>

              <h2 className="text-balance text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {activeLesson.title}
              </h2>
            </div>

            <LessonBody lesson={activeLesson} />

            {isLastLesson && <ExamCallToAction moduleTitle={mod.title} />}
          </div>

          {/* Previous / next */}
          <footer className="sticky bottom-0 z-10 border-t border-border bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              <p className="shrink-0 whitespace-nowrap text-xs font-bold text-muted-foreground" aria-live="polite">
                <span className="sr-only">
                  Pelajaran {activeLesson.number}: {activeLesson.title}.{' '}
                </span>
                <span aria-hidden="true">
                  {activeIndex + 1} / {lessons.length}
                </span>
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => selectLesson(lessons[activeIndex - 1].id)}
                  disabled={activeIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-extrabold text-foreground transition-all hover:bg-neutral-100 disabled:opacity-40 sm:text-sm"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>

                {isLastLesson ? (
                  <Link
                    href={EXAM_HREF}
                    className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 text-xs font-black text-black shadow-xs transition-all hover:scale-105 hover:bg-[#c7f42e] active:scale-95 sm:px-5 sm:text-sm"
                  >
                    <Award className="size-4" aria-hidden="true" />
                    <span className="whitespace-nowrap">Ikuti Ujian Modul</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectLesson(lessons[activeIndex + 1].id)}
                    aria-label="Pelajaran Berikutnya"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#111] px-4 py-2 text-xs font-black text-lime shadow-xs transition-all hover:bg-neutral-800 sm:text-sm"
                  >
                    <span className="whitespace-nowrap">
                      <span className="hidden sm:inline">Pelajaran </span>Berikutnya
                    </span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </footer>
        </main>

        {/* Table of contents: right column on desktop, drawer on mobile */}
        <aside
          id="course-sidebar"
          aria-label="Daftar isi modul"
          className={cn(
            'fixed inset-y-0 right-0 z-40 flex w-full max-w-xs flex-col border-l border-border bg-white duration-300 ease-in-out sm:max-w-sm lg:static lg:w-80 lg:max-w-none lg:translate-x-0 xl:w-96',
            // Visible at once when opening (so focus can move in); hidden only after the slide-out when closing,
            // which also keeps the off-screen drawer out of the tab order on mobile.
            isMobileSidebarOpen
              ? 'translate-x-0 shadow-2xl transition-transform'
              : 'translate-x-full transition-[transform,visibility] max-lg:invisible lg:translate-x-0',
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4 py-3.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground sm:text-sm">Daftar isi</h2>
            <button
              ref={sidebarCloseRef}
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-neutral-100 lg:hidden"
              aria-label="Tutup daftar isi"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-1 flex-col space-y-4 overflow-y-auto p-4">
            <div className="relative">
              <label htmlFor="course-search" className="sr-only">
                Cari pelajaran atau bab
              </label>
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="course-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pelajaran atau bab..."
                className="w-full rounded-xl border border-border bg-neutral-50 py-2 pl-9 pr-8 text-xs font-medium placeholder:text-muted-foreground focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111] sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Hapus pencarian"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {filteredChapters.length === 0 ? (
              <output className="block px-1 text-xs font-medium text-muted-foreground">
                Tidak ada pelajaran yang cocok dengan “{searchQuery.trim()}”.
              </output>
            ) : (
              <div className="space-y-4">
                {filteredChapters.map(({ chapter, lessons: shownLessons }) => {
                  const isExpanded = query ? true : !collapsedChapters[chapter.id]
                  const openedInChapter = chapter.lessons.filter((l) => openedIds.includes(l.id)).length
                  const listId = `${chapter.id}-pelajaran`

                  return (
                    <div key={chapter.id} className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-2xs">
                      <h3>
                        <button
                          type="button"
                          onClick={() => toggleChapter(chapter.id)}
                          className="flex w-full items-center justify-between bg-neutral-50/70 p-3 text-left transition-colors hover:bg-neutral-100"
                          aria-expanded={isExpanded}
                          aria-controls={listId}
                        >
                          <span className="flex min-w-0 flex-col pr-2">
                            <span className="truncate text-xs font-black text-foreground">
                              Bab {chapter.number} · {chapter.title}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {openedInChapter} dari {chapter.lessons.length} dibuka
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          )}
                        </button>
                      </h3>

                      {isExpanded && (
                        <ul id={listId} className="divide-y divide-border/60">
                          {shownLessons.map((lesson) => {
                            const isActive = lesson.id === activeLesson.id
                            const isOpened = openedIds.includes(lesson.id)

                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  onClick={() => selectLesson(lesson.id)}
                                  aria-current={isActive ? 'true' : undefined}
                                  className={cn(
                                    'flex w-full items-center gap-2.5 p-3 text-left transition-all',
                                    isActive
                                      ? 'border-l-4 border-[#7c3aed] bg-purple-50 font-bold text-purple-950'
                                      : 'font-medium text-foreground hover:bg-neutral-50',
                                  )}
                                >
                                  <LessonIndicator active={isActive} opened={isOpened} />
                                  <span
                                    className={cn(
                                      'line-clamp-2 min-w-0 flex-1 text-xs',
                                      isActive ? 'font-extrabold text-purple-950' : 'text-foreground/90',
                                    )}
                                  >
                                    <span className="mr-1 font-semibold text-muted-foreground">{lesson.number}</span>
                                    {lesson.title}
                                  </span>
                                  {isOpened && !isActive && <span className="sr-only">(sudah dibuka)</span>}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-2.5 rounded-2xl border-2 border-dashed border-border bg-neutral-50/80 p-4">
              <p className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <Award className="size-4 text-[#7c3aed]" aria-hidden="true" />
                Ujian modul
              </p>
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                PIN ujian: <strong className="font-black text-[#7c3aed]">minta ke guru</strong>
              </p>
              <Link
                href={EXAM_HREF}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#111] py-2.5 text-xs font-black text-lime transition-all hover:bg-neutral-800"
              >
                <GraduationCap className="size-3.5" aria-hidden="true" />
                <span>Buka Halaman Ujian</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>

        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}

function LessonIndicator({ active, opened }: { active: boolean; opened: boolean }) {
  if (active) {
    return (
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] shadow-2xs"
      >
        <span className="size-1.5 rounded-full bg-white" />
      </span>
    )
  }
  if (opened) {
    return (
      <span
        aria-hidden="true"
        title="Sudah dibuka"
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs"
      >
        <Eye className="size-3" />
      </span>
    )
  }
  return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-2 border-neutral-300" />
}

function LessonBody({ lesson }: { lesson: ModuleLesson }) {
  const { content } = lesson

  switch (content.kind) {
    case 'summary':
      return (
        <div className="rounded-2xl border-2 border-[#111] bg-lime p-5 shadow-xs sm:p-7">
          <p className="whitespace-pre-line text-base font-bold leading-relaxed text-[#111] sm:text-lg">{content.text}</p>
        </div>
      )

    case 'points':
      return (
        <ul className="flex flex-col gap-3 sm:gap-4">
          {content.points.map((point, i) => (
            <li
              key={`${i}-${point}`}
              className="flex items-start gap-3 rounded-2xl border border-border bg-neutral-50/80 p-4 text-base leading-relaxed text-foreground/90 sm:p-5 sm:text-lg"
            >
              <span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-xs bg-[#111] ring-2 ring-lime" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )

    case 'concept-map':
      return (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-xs sm:gap-6 sm:p-6 md:p-8">
          <p className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Konsep utama</span>
            <span className="inline-flex rounded-full bg-[#111] px-5 py-2.5 text-sm font-black text-white shadow-xs sm:px-6 sm:py-3 sm:text-base">
              {content.center}
            </span>
          </p>
          <div aria-hidden="true" className="h-6 w-0.5 bg-neutral-300" />
          <ul aria-label={`Cabang dari ${content.center}`} className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {content.branches.map((branch, i) => (
              <li
                key={`${i}-${branch.label}`}
                className="flex flex-col rounded-2xl border-2 border-[#111] bg-white px-4 py-3 shadow-xs sm:px-5 sm:py-4"
              >
                <span className="text-sm font-bold text-foreground sm:text-base">{branch.label}</span>
                {branch.children.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {branch.children.map((child, j) => (
                      <li
                        key={`${j}-${child}`}
                        className="flex items-start gap-2 text-xs leading-snug text-muted-foreground sm:text-sm"
                      >
                        <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neutral-400" />
                        <span>{child}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )

    case 'glossary':
      return (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {content.entries.map((entry, i) => (
            <div
              key={`${i}-${entry.term}`}
              className="flex flex-col rounded-2xl border border-border/80 bg-neutral-50/80 p-4 sm:p-5"
            >
              <dt className="text-sm font-extrabold text-foreground sm:text-base">{entry.term}</dt>
              <dd className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {entry.definition || 'Belum ada penjelasan.'}
              </dd>
            </div>
          ))}
        </dl>
      )
  }
}

function ExamCallToAction({ moduleTitle }: { moduleTitle: string }) {
  return (
    <section
      aria-labelledby="ujian-modul-heading"
      className="mt-8 animate-fade-up overflow-hidden rounded-3xl border-2 border-[#111] bg-gradient-to-br from-lime/30 via-white to-purple-50 p-6 shadow-xs sm:p-8"
    >
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#111] px-3 py-1 text-xs font-black text-lime">
            <Award className="size-3.5" aria-hidden="true" />
            <span>Pelajaran terakhir</span>
          </div>
          <h3 id="ujian-modul-heading" className="text-xl font-black text-foreground sm:text-2xl">
            Uji Pemahaman: {moduleTitle}
          </h3>
          <p className="max-w-xl text-xs font-medium leading-relaxed text-muted-foreground sm:text-sm">
            Anda sudah sampai di pelajaran terakhir. Jika guru sudah membuka ujian, masukkan PIN-nya di halaman ujian.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-bold text-neutral-700">
            {/* Each exam gets its own PIN from the server; the teacher hands it out in class. */}
            <span className="rounded-lg border border-border bg-white px-2.5 py-1 text-foreground shadow-2xs">
              PIN ujian: <strong className="font-black text-[#7c3aed]">minta ke guru</strong>
            </span>
          </div>
        </div>

        <Link
          href={EXAM_HREF}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#111] px-6 py-3.5 text-sm font-black text-lime shadow-sm transition-all hover:scale-105 hover:bg-neutral-800 active:scale-95"
        >
          <GraduationCap className="size-4" aria-hidden="true" />
          <span>Mulai Ujian Sekarang</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
