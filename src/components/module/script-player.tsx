'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  ChevronRight,
  Eye,
  Headphones,
  Pause,
  Play,
  Sparkles,
  Square,
  Subtitles,
  Volume2,
} from 'lucide-react'
import { btnPrimary, btnSecondary } from '@/components/site/form'
import { cn } from '@/lib/utils'
import type { VisualSummary } from '@/lib/types'
import { VisualSummaryView } from '@/components/module/visual-summary'

interface ScriptPlayerProps {
  script: string
  moduleId?: string
  moduleTitle?: string
  visualData?: VisualSummary
}

export function ScriptPlayer({
  script,
  moduleId,
  moduleTitle = 'Materi Pembelajaran',
  visualData,
}: ScriptPlayerProps) {
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [supported, setSupported] = useState(true)
  const [speechRate, setSpeechRate] = useState<0.8 | 1.0 | 1.2>(1.0)

  // Active view: 'audio-text' | 'visual-summary'
  const [viewMode, setViewMode] = useState<'audio-text' | 'visual-summary'>('audio-text')

  // Font size multiplier for deaf / visually focused reading: 'sm' | 'base' | 'lg'
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base')

  // Active sentence index for live visual captioning
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Parse script into distinct sentences/segments for visual tracking
  const sentences = useMemo(() => {
    return script
      .split(/(?<=[.!?])\s+|\n\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }, [script])

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      window.speechSynthesis?.cancel()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // SpeechGuard cancels speech when the tab is hidden; reset the controls so they don't still say "Jeda".
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (state === 'playing') pause()
        else play()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, speechRate])

  function play(rateToUse = speechRate) {
    const synth = window.speechSynthesis
    if (!synth) return
    if (state === 'paused') {
      synth.resume()
      setState('playing')
      startSentenceTimer(rateToUse)
      return
    }

    synth.cancel()
    setActiveSentenceIndex(0)
    const u = new SpeechSynthesisUtterance(script)
    u.lang = 'id-ID'
    u.rate = rateToUse

    u.onend = () => {
      setState('idle')
      if (timerRef.current) clearInterval(timerRef.current)
      setActiveSentenceIndex(sentences.length - 1)
    }

    synth.speak(u)
    setState('playing')
    startSentenceTimer(rateToUse)
  }

  function changeRate(newRate: 0.8 | 1.0 | 1.2) {
    setSpeechRate(newRate)
    if (state === 'playing') {
      window.speechSynthesis?.cancel()
      play(newRate)
    }
  }

  function pause() {
    window.speechSynthesis?.pause()
    setState('paused')
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function stop() {
    window.speechSynthesis?.cancel()
    setState('idle')
    if (timerRef.current) clearInterval(timerRef.current)
    setActiveSentenceIndex(0)
  }

  // Timer to advance sentence tracking visually
  function startSentenceTimer(rateToUse = speechRate) {
    if (timerRef.current) clearInterval(timerRef.current)
    // Approximate pacing adjusted for speech rate
    const interval = Math.round(3500 / rateToUse)
    timerRef.current = setInterval(() => {
      setActiveSentenceIndex((prev) => {
        if (prev < sentences.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, interval)
  }

  const currentSentence = sentences[activeSentenceIndex] || sentences[0] || ''

  return (
    <div className="@container flex flex-col gap-6">
      {/* 1. TUNARUNGU FRIENDLY ACCESSIBILITY BANNER */}
      {/* Layout follows this player's own width (@container), not the viewport: it often sits beside the lesson sidebar. */}
      <div className="flex flex-col @2xl:flex-row items-start @2xl:items-center justify-between gap-4 rounded-2xl border-2 border-[#111] bg-gradient-to-r from-lime/30 via-white to-purple-50 p-4 sm:p-5 shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime shadow-xs">
            <Eye className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-foreground">
              <Sparkles className="size-3.5 text-[#7c3aed]" aria-hidden="true" />
              Aksesibilitas Ganda: Ramah Tunarungu & Tunanetra
            </span>
            <p className="text-xs font-medium text-muted-foreground">
              Tersedia teks berjalan (live captions), naskah tersinkronisasi, dan ringkasan visual kartu belajar.
            </p>
          </div>
        </div>

        {/* View Switcher Toggle */}
        {visualData && (
          <div className="flex shrink-0 items-center rounded-xl border border-border bg-white p-1 shadow-2xs self-stretch @2xl:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('audio-text')}
              className={cn(
                'flex flex-1 @2xl:flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all',
                viewMode === 'audio-text'
                  ? 'bg-[#111] text-lime shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Headphones className="size-3.5" aria-hidden="true" />
              <span>Naskah Audio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Mode Visual has no audio controls, so the narration stops instead of playing on unseen.
                stop()
                setViewMode('visual-summary')
              }}
              className={cn(
                'flex flex-1 @2xl:flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all',
                viewMode === 'visual-summary'
                  ? 'bg-lime text-black shadow-2xs font-black'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              <span>Mode Visual</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. MODE VISUAL SUMMARY VIEW (IF TOGGLED) */}
      {viewMode === 'visual-summary' && visualData ? (
        <div className="flex flex-col gap-6 animate-fade-up">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-[#7c3aed]" aria-hidden="true" />
              Ringkasan Visual Modul Pembelajaran
            </h3>
            <button
              type="button"
              onClick={() => setViewMode('audio-text')}
              className="text-xs font-bold text-muted-foreground underline hover:text-foreground"
            >
              Kembali ke Naskah Audio
            </button>
          </div>
          <VisualSummaryView data={visualData} />

          {/* Exam Button for Visual View */}
          <div className="mt-6 rounded-2xl border-2 border-[#111] bg-lime p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-800">
                Tahap Evaluasi
              </span>
              <h4 className="text-lg font-black text-black">Uji Pemahaman Materi Modul Ini</h4>
              <p className="text-xs font-semibold text-neutral-800">
                Masukkan <strong>PIN ujian 4 angka dari guru</strong> untuk mengikuti ujian pilihan ganda.
              </p>
            </div>
            <Link
              href="/tunarungu/ujian"
              className="inline-flex items-center gap-2 rounded-xl bg-[#111] px-5 py-3 text-xs sm:text-sm font-black text-lime hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <Award className="size-4" aria-hidden="true" />
              <span>Lanjut ke Ujian Visual</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        /* 3. MODE AUDIO & LIVE TEXT TRANSCRIPT (TUNARUNGU ACCESSIBLE) */
        <div className="flex flex-col gap-5 animate-fade-up">
          {/* Controls & Soundwave Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {supported ? (
                <>
                  {state === 'playing' ? (
                    <button type="button" className={btnPrimary} onClick={pause}>
                      <Pause className="size-4" aria-hidden="true" /> Jeda
                    </button>
                  ) : (
                    <button type="button" className={btnPrimary} onClick={() => play()}>
                      <Play className="size-4" aria-hidden="true" /> {state === 'paused' ? 'Lanjutkan' : 'Putar Suara'}
                    </button>
                  )}
                  {state !== 'idle' && (
                    <button type="button" className={btnSecondary} onClick={stop}>
                      <Square className="size-4" aria-hidden="true" /> Berhenti
                    </button>
                  )}

                  {/* Speech Rate Controls (PRD F-03: 0.8x, 1.0x, 1.2x) */}
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-neutral-100 p-1 text-xs font-bold" aria-label="Kecepatan Bicara">
                    <span className="px-2 text-muted-foreground hidden sm:inline">Kecepatan:</span>
                    {([0.8, 1.0, 1.2] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => changeRate(r)}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-black transition-all min-w-[3rem]',
                          speechRate === r
                            ? 'bg-[#111] text-lime shadow-xs scale-105'
                            : 'text-neutral-700 hover:text-black hover:bg-white',
                        )}
                        aria-pressed={speechRate === r}
                      >
                        {r.toFixed(1)}x
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Browser tidak mendukung suara. Gunakan naskah teks visual di bawah.
                </p>
              )}

              {/* Visual Soundwave Indicator for Deaf Users */}
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                  state === 'playing'
                    ? 'bg-lime/30 text-neutral-900 border border-lime'
                    : 'bg-neutral-100 text-muted-foreground',
                )}
                title={state === 'playing' ? 'Audio sedang berbicara' : 'Audio mati / jeda'}
              >
                <div className="flex items-end gap-0.5 h-4">
                  <span
                    className={cn(
                      'w-1 rounded-full bg-current transition-all',
                      state === 'playing' ? 'h-4 animate-pulse' : 'h-1.5',
                    )}
                  />
                  <span
                    className={cn(
                      'w-1 rounded-full bg-current transition-all',
                      state === 'playing' ? 'h-3 animate-bounce' : 'h-2',
                    )}
                  />
                  <span
                    className={cn(
                      'w-1 rounded-full bg-current transition-all',
                      state === 'playing' ? 'h-4.5 animate-pulse' : 'h-1.5',
                    )}
                  />
                  <span
                    className={cn(
                      'w-1 rounded-full bg-current transition-all',
                      state === 'playing' ? 'h-2.5 animate-bounce' : 'h-2',
                    )}
                  />
                </div>
                <span>
                  {state === 'playing'
                    ? 'Suara Sedang Berbicara'
                    : state === 'paused'
                    ? 'Suara Dijeda'
                    : 'Audio Siap'}
                </span>
              </div>
            </div>

            {/* Font Size Adjuster for Reading Comfort */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-neutral-50 p-1 text-xs font-extrabold">
              <span className="px-1.5 text-muted-foreground">Ukuran Teks:</span>
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  fontSize === 'sm' ? 'bg-white shadow-xs font-black text-foreground' : 'text-muted-foreground',
                )}
              >
                Kecil
              </button>
              <button
                type="button"
                onClick={() => setFontSize('base')}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  fontSize === 'base' ? 'bg-white shadow-xs font-black text-foreground' : 'text-muted-foreground',
                )}
              >
                Sedang
              </button>
              <button
                type="button"
                onClick={() => setFontSize('lg')}
                className={cn(
                  'rounded px-2 py-0.5 transition-colors',
                  fontSize === 'lg' ? 'bg-white shadow-xs font-black text-foreground' : 'text-muted-foreground',
                )}
              >
                Besar
              </button>
            </div>
          </div>

          {/* 4. LIVE CAPTION BOX (SUBTITEL BERJALAN) */}
          <div className="flex items-start gap-3 rounded-2xl border-2 border-[#111] bg-black p-4 text-white shadow-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-lime text-black">
              <Subtitles className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-lime">
                Subtitel Langsung (Live Caption)
              </span>
              <p className="text-sm sm:text-base font-extrabold text-white leading-relaxed text-balance">
                "{currentSentence}"
              </p>
            </div>
          </div>

          {/* 5. FULL SYNCHRONIZED TRANSCRIPT WITH SENTENCE HIGHLIGHT */}
          <div
            className={cn(
              'rounded-2xl border border-border bg-white p-5 sm:p-7 shadow-2xs leading-relaxed space-y-4',
              fontSize === 'sm' && 'text-base',
              fontSize === 'base' && 'text-lg',
              fontSize === 'lg' && 'text-xl',
            )}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-3 text-xs font-bold text-muted-foreground">
              <span>Naskah Materi Lengkap ({sentences.length} Paragraf)</span>
              <span>Klik kalimat untuk menyorot</span>
            </div>

            <div className="space-y-3">
              {sentences.map((sent, sIdx) => {
                const isActive = sIdx === activeSentenceIndex && state === 'playing'

                return (
                  <p
                    key={sIdx}
                    onClick={() => setActiveSentenceIndex(sIdx)}
                    className={cn(
                      'cursor-pointer rounded-xl p-2.5 transition-all text-balance',
                      isActive
                        ? 'bg-lime/25 border-l-4 border-lime text-foreground font-bold shadow-2xs'
                        : 'hover:bg-neutral-50 text-foreground/90 font-medium',
                    )}
                  >
                    {sent}
                  </p>
                )
              })}
            </div>
          </div>

          {/* 6. TOMBOL MENGARAH KE UJIAN (DI AKHIR BAB / NASKAH) */}
          <div className="rounded-3xl border-2 border-[#111] bg-gradient-to-br from-lime/20 via-white to-purple-50 p-6 sm:p-8 shadow-xs flex flex-col @5xl:flex-row items-start @5xl:items-center justify-between gap-6">
            <div className="min-w-0 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#111] px-3 py-1 text-xs font-black text-lime">
                <Award className="size-3.5" aria-hidden="true" />
                <span>Naskah Selesai Dipelajari</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                Siap Menguji Pemahaman Anda?
              </h3>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
                Anda telah mempelajari seluruh naskah modul ini. Ikuti ujian evaluasi untuk mendapatkan nilai pemahaman belajar Anda.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold text-neutral-700">
                {/* Each exam gets its own PIN from the server; the teacher hands it out in class. */}
                <span className="rounded-md bg-white border border-border px-2.5 py-1 shadow-2xs">
                  PIN ujian: <strong className="text-[#7c3aed] font-black">minta ke guru</strong>
                </span>
                <span className="text-muted-foreground">· Ramah Tunarungu & Tunanetra</span>
              </div>
            </div>

            {/* Buttons sit side by side when both fit, otherwise each wraps to its own full-width row. */}
            <div className="flex flex-wrap gap-2.5 shrink-0 w-full @5xl:w-auto">
              <Link
                href="/tunarungu/ujian"
                className="inline-flex grow items-center justify-center gap-2 rounded-2xl border-2 border-[#111] bg-lime px-5 py-3.5 text-xs sm:text-sm font-black text-black hover:bg-[#c7f42e] transition-all hover:scale-105 active:scale-95 shadow-xs"
              >
                <Eye className="size-4" aria-hidden="true" />
                <span>Ujian Visual (Tunarungu)</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/tunanetra/ujian"
                className="inline-flex grow items-center justify-center gap-2 rounded-2xl bg-[#111] px-5 py-3.5 text-xs sm:text-sm font-black text-lime hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 shadow-xs"
              >
                <Volume2 className="size-4" aria-hidden="true" />
                <span>Ujian Audio (Tunanetra)</span>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
