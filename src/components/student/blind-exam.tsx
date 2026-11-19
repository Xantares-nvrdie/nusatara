'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Hand, Mic, WifiOff } from 'lucide-react'
import { getRecognition, playBeep, speak, stopSpeaking } from '@/lib/speech'
import { LETTERS, type Letter } from '@/lib/types'
import { useExamAttempt } from '@/lib/use-exam-attempt'
import { type VoiceStopReason, useVoiceMode } from '@/lib/use-voice-mode'
import { command, parseAnswer, parseDigits, parseName } from '@/lib/voice-commands'
import { cn } from '@/lib/utils'

type Phase = ReturnType<typeof useExamAttempt>['phase']

const TAP_INSTRUCTIONS =
  'Mode ketuk aktif. Ketuk satu kali untuk A, dua kali untuk B, tiga kali untuk C, atau empat kali untuk D. Ketuk dua jari untuk ulangi soal. Geser kiri untuk kembali, geser kanan untuk lanjut.'

/** What voice mode tells the student to say on each step. Steps without a hint don't listen. */
const VOICE_STEP_HINT: Partial<Record<Phase, string>> = {
  name: 'Sebutkan nama Anda.',
  pin: 'Sebutkan empat angka PIN ujian.',
  question: 'Katakan: Jawab A, B, C, atau D. Atau: Ulangi soal.',
  review: 'Katakan: Kirim, untuk mengirim jawaban. Atau: Periksa, untuk kembali ke soal.',
  error: 'Katakan: Coba lagi.',
}

const VOICE_STOP_MESSAGE: Record<VoiceStopReason, string> = {
  unsupported:
    'Pengenalan suara tidak berjalan di browser ini. Untuk mode suara, buka halaman ini di Google Chrome dan pastikan mikrofon menyala.',
  blocked: 'Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser, lalu tekan V lagi.',
  'no-mic': 'Mikrofon tidak ditemukan. Sambungkan mikrofon, lalu tekan V lagi.',
  offline: 'Mode suara butuh koneksi internet.',
}

const hcBtn =
  'min-h-16 rounded-2xl border-4 border-[#FFE600] px-6 text-xl font-black text-[#FFE600] transition-colors hover:bg-[#FFE600] hover:text-black focus-visible:bg-[#FFE600] focus-visible:text-black focus-visible:outline-[4px] focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-50'
const hcInput =
  'min-h-16 w-full rounded-2xl border-4 border-[#FFE600] bg-black px-5 text-2xl font-bold text-white placeholder:text-white/50 focus-visible:outline-[4px] focus-visible:outline-offset-4 focus-visible:outline-white'

export function BlindExam() {
  const x = useExamAttempt('tunanetra')
  const [nameInput, setNameInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [hint, setHint] = useState('')
  const [tapMode, setTapMode] = useState(false)

  // F-04b Tap & gesture states
  const [tapCount, setTapCount] = useState(0)
  const [pendingLetter, setPendingLetter] = useState<Letter | null>(null)
  const [confirmTapCount, setConfirmTapCount] = useState(0)
  const [pendingSubmitConfirm, setPendingSubmitConfirm] = useState(false)
  const [submitTapCount, setSubmitTapCount] = useState(0)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null)
  const confirmTapTimerRef = useRef<NodeJS.Timeout | null>(null)
  const submitTapTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number; touches: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** Mirrors `voice.active` for the spoken prompts, which are built in an effect declared before `voice`. */
  const voiceOnRef = useRef(false)
  /** True between saving an answer and moving to the next question. */
  const advancingRef = useRef(false)

  const q = x.exam?.questions[x.index]
  const total = x.exam?.questions.length ?? 0
  const answeredCount = x.exam ? x.exam.questions.filter((qq) => x.answers[qq.id]).length : 0

  const readQuestion = useCallback(() => {
    if (!q) return
    const chosen = x.answers[q.id]
    speak(
      `Soal ${x.index + 1} dari ${total}. ${q.text}. ` +
        LETTERS.map((l) => `${l}. ${q.options[l]}.`).join(' ') +
        (chosen
          ? ` Jawaban Anda saat ini ${chosen}.`
          : tapMode
          ? ' Mode ketuk aktif. Ketuk satu kali untuk A, dua kali untuk B, tiga kali untuk C, atau empat kali untuk D.'
          : ' Katakan: Jawab, A, B, C, atau D. Atau tekan tombol pada keyboard.'),
    )
  }, [q, total, x.answers, x.index, tapMode])

  // Fullscreen trigger upon entering question mode
  useEffect(() => {
    if (x.phase === 'question' && typeof document !== 'undefined' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        // Fullscreen might be blocked by browser policy without user gesture
      })
    }
  }, [x.phase])

  // Online recovery: auto-retry if network comes back after a failure
  useEffect(() => {
    function onOnline() {
      if (x.phase === 'error' && x.error?.code === 'NETWORK') {
        speak('Koneksi terhubung kembali. Mencoba mengirimkan jawaban otomatis.')
        x.retry()
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [x])

  // Phase change voice prompts
  useEffect(() => {
    headingRef.current?.focus()
    // In voice mode the prompts say what to speak; otherwise which keys to press.
    const voiceOn = voiceOnRef.current
    const prompts: Partial<Record<Phase, string>> = {
      name: voiceOn
        ? `Ujian suara tunanetra. ${VOICE_STEP_HINT.name}`
        : 'Ujian suara tunanetra. Tekan V sekali untuk mode suara, lalu sebutkan nama Anda. Atau ketik nama lalu tekan Enter.',
      pin: `Halo ${x.name}. ${voiceOn ? VOICE_STEP_HINT.pin : 'Masukkan PIN ujian empat angka, lalu tekan Enter.'}`,
      loading: 'Memuat ujian.',
      review: `Anda menjawab ${answeredCount} dari ${total} soal. ${
        voiceOn ? VOICE_STEP_HINT.review : 'Tekan Enter untuk mengirim, atau tekan P untuk periksa kembali.'
      }`,
      submitting: 'Mengirim jawaban ke server.',
      result: x.result
        ? `Jawaban terkirim. Nilai Anda ${x.result.score}. Benar ${x.result.correctCount} dari ${x.result.totalQuestions} soal.`
        : '',
      error: x.error ? `${x.error.message} ${voiceOn ? VOICE_STEP_HINT.error : 'Tekan Enter untuk mencoba lagi.'}` : '',
    }
    if (x.phase === 'question') {
      readQuestion()
    } else if (prompts[x.phase]) {
      speak(prompts[x.phase]!)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x.phase, x.index])

  useEffect(() => () => stopSpeaking(), [])

  // Leaving the tab silences the exam (SpeechGuard cancels speech; voice mode pauses the microphone).
  // Coming back reads the current question again so the student knows where they are.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && x.phase === 'question') readQuestion()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [x.phase, readQuestion])

  const next = useCallback(() => {
    setPendingLetter(null)
    setPendingSubmitConfirm(false)
    if (x.index < total - 1) {
      x.setIndex(x.index + 1)
    } else {
      x.setPhase('review')
    }
  }, [x, total])

  const prev = useCallback(() => {
    setPendingLetter(null)
    setPendingSubmitConfirm(false)
    if (x.phase === 'review') {
      x.setPhase('question')
    } else if (x.index > 0) {
      x.setIndex(x.index - 1)
    }
  }, [x])

  // Answer selection: record answer, audio feedback, and automatically move to next question (PRD F-04)
  const choose = useCallback(
    (l: Letter, autoAdvance = true) => {
      if (!q) return
      x.answer(q.id, l)
      playBeep()
      setPendingLetter(null)
      speak(`Jawaban ${l} tersimpan, lanjut ke soal berikutnya.`)
      if (autoAdvance) {
        // Voice mode must not listen in this gap, or the next answer would land on this question.
        advancingRef.current = true
        setTimeout(() => {
          advancingRef.current = false
          next()
        }, 1200)
      }
    },
    [q, x, next],
  )

  // Toggle Tap Fallback Mode (PRD F-04b). `reason` explains why voice mode had to give up first.
  const activateTapMode = useCallback((reason?: string) => {
    setTapMode(true)
    playBeep()
    setHint(reason ? `${reason} Mode ketuk aktif.` : 'Mode ketuk aktif (F-04b)')
    speak(reason ? `${reason} ${TAP_INSTRUCTIONS}` : TAP_INSTRUCTIONS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // What the student said, handled for the step they are on right now (PRD F-04).
  function handleTranscript(text: string) {
    setHint(`Terdengar: “${text}”`)

    if (x.phase === 'name') {
      const name = parseName(text)
      setNameInput(name)
      if (!x.confirmName(name)) speak('Nama belum terdengar. Sebutkan nama Anda.')
    } else if (x.phase === 'pin') {
      const d = parseDigits(text)
      setPinInput(d)
      if (!/^\d{4}$/.test(d)) {
        speak(d ? `Terdengar ${d.split('').join(' ')}. PIN harus empat angka. Sebutkan lagi.` : 'PIN belum terdengar. Sebutkan empat angka PIN.')
        return
      }
      x.loadPin(d)
    } else if (x.phase === 'question' && q) {
      // An explicit "Jawab B" wins over everything else in the sentence.
      const explicit = /\b(jawab|jawaban|jawabannya|pilih|pilihan|opsi)\b/i.test(text) ? parseAnswer(text, q.options) : null
      if (explicit) return choose(explicit, true)
      // The mic is always on in voice mode, so a stray "selesai" only opens the summary; "Kirim" there submits.
      if (command.finish(text)) return x.setPhase('review')
      if (command.repeat(text)) return readQuestion()
      if (command.next(text)) return next()
      if (command.prev(text)) return x.index === 0 ? speak('Ini soal pertama.') : prev()
      const answer = parseAnswer(text, q.options)
      if (answer) return choose(answer, true)
      speak('Perintah tidak dikenali. Katakan: Jawab A, B, C, atau D. Atau: Ulangi soal.')
    } else if (x.phase === 'review') {
      if (command.review(text)) return prev()
      if (command.send(text)) return x.submit()
      speak('Katakan: Kirim, atau: Periksa.')
    } else if (x.phase === 'error') {
      if (command.retry(text)) return x.retry()
      speak('Katakan: Coba lagi.')
    }
  }

  // Hands-free voice mode: one press (button or V) keeps it listening after every spoken prompt.
  const voice = useVoiceMode({
    canListen: () => !tapMode && !advancingRef.current && Boolean(VOICE_STEP_HINT[x.phase]),
    onTranscript: handleTranscript,
    onStop: (reason) => activateTapMode(VOICE_STOP_MESSAGE[reason]),
  })

  voiceOnRef.current = voice.active

  function toggleVoiceMode() {
    if (voice.active) {
      voice.stop()
      speak('Mode suara dimatikan. Tekan V untuk menyalakannya lagi.')
      return
    }
    if (!getRecognition()) {
      activateTapMode(VOICE_STOP_MESSAGE.unsupported)
      return
    }
    setTapMode(false)
    // Listening starts after this sentence (and after every later prompt), with a beep each time.
    speak(`Mode suara aktif. Bicara setelah bunyi bip. ${VOICE_STEP_HINT[x.phase] ?? ''}`)
    voice.start()
  }

  // Tap mode and voice mode exclude each other: the mic would hear the taps' spoken feedback.
  function toggleTapMode() {
    if (tapMode) {
      setTapMode(false)
      speak('Mode ketuk dimatikan. Tekan V untuk mode suara.')
    } else {
      voice.stop()
      activateTapMode()
    }
  }

  // The keyboard and long-press handlers are registered once; read the latest toggles through refs.
  const toggleVoiceRef = useRef(toggleVoiceMode)
  toggleVoiceRef.current = toggleVoiceMode
  const toggleTapRef = useRef(toggleTapMode)
  toggleTapRef.current = toggleTapMode

  // Keyboard accessibility fallback (PRD F-04: A, B, C, D, Spasi untuk ulangi suara)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement).tagName === 'INPUT'
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toUpperCase()

      // V turns hands-free voice mode on or off
      if (k === 'V') {
        e.preventDefault()
        return toggleVoiceRef.current()
      }

      // Toggle Tap Mode manually with T (PRD F-04b)
      if (k === 'T') {
        e.preventDefault()
        return toggleTapRef.current()
      }

      if (x.phase === 'question') {
        // A, B, C, D to answer (auto next)
        if ((LETTERS as string[]).includes(k)) {
          e.preventDefault()
          choose(k as Letter, true)
        }
        // Spasi atau R untuk ulangi soal (PRD F-04)
        else if (e.code === 'Space' || k === 'R') {
          e.preventDefault()
          readQuestion()
        } else if (k === 'N' || e.key === 'ArrowRight') {
          e.preventDefault()
          next()
        } else if (k === 'P' || e.key === 'ArrowLeft') {
          e.preventDefault()
          prev()
        }
      } else if (x.phase === 'review') {
        if (e.key === 'Enter') x.submit()
        else if (k === 'P') prev()
      } else if (x.phase === 'error' && e.key === 'Enter') {
        x.retry()
      } else if (x.phase === 'result' && e.key === 'Enter') {
        x.reset()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [x, q, choose, next, prev, readQuestion])

  /* ------------------------------------------------------------------ */
  /* F-04b Mode Cadangan Ketuk & Geser (Tap & Gesture Fallback) Engine  */
  /* ------------------------------------------------------------------ */

  // Touch Start Handler: detect multi-touch and initiate long-press (2s)
  function handleTouchStart(e: React.TouchEvent) {
    if (x.phase !== 'question') return
    const touches = e.touches.length
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), touches }

    // Manual activation trigger: Tahan layar 2 detik (PRD F-04b)
    if (!tapMode && touches === 1) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = setTimeout(() => {
        toggleTapRef.current()
      }, 2000)
    }
  }

  const touchFiredRef = useRef(false)

  // Trigger Single Tap Processing (Compatible with Touch & Desktop Mouse Click)
  const registerTap = useCallback(() => {
    if (x.phase !== 'question') return

    // 3A. Konfirmasi Pengiriman Ujian di akhir soal
    if (pendingSubmitConfirm) {
      const nextCount = submitTapCount + 1
      setSubmitTapCount(nextCount)
      if (submitTapTimerRef.current) clearTimeout(submitTapTimerRef.current)
      submitTapTimerRef.current = setTimeout(() => {
        if (nextCount === 1) {
          speak('Mengirim jawaban ke server.')
          x.submit()
        } else {
          setPendingSubmitConfirm(false)
          setSubmitTapCount(0)
          speak('Pengiriman dibatalkan. Kembali ke soal.')
        }
      }, 1200)
      return
    }

    // 3B. Konfirmasi Pilihan Jawaban: Ketuk 1x = Yakin, Ketuk 2x = Pilih Ulang
    if (pendingLetter) {
      const nextConfirmCount = confirmTapCount + 1
      setConfirmTapCount(nextConfirmCount)
      if (confirmTapTimerRef.current) clearTimeout(confirmTapTimerRef.current)
      confirmTapTimerRef.current = setTimeout(() => {
        if (nextConfirmCount === 1) {
          // Yakin: simpan & lanjut otomatis
          choose(pendingLetter, true)
          setPendingLetter(null)
          setConfirmTapCount(0)
        } else {
          // Pilih ulang
          setPendingLetter(null)
          setConfirmTapCount(0)
          speak('Silakan pilih ulang. Ketuk satu sampai empat kali.')
        }
      }, 1200)
      return
    }

    // 3C. Hitungan Ketukan Pilihan: 1x=A, 2x=B, 3x=C, 4x=D (Jeda 1.2 detik)
    const currentTaps = tapCount + 1
    setTapCount(currentTaps)
    playBeep()

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => {
      let selected: Letter | null = null
      if (currentTaps === 1) selected = 'A'
      else if (currentTaps === 2) selected = 'B'
      else if (currentTaps === 3) selected = 'C'
      else if (currentTaps >= 4) selected = 'D'

      setTapCount(0)
      if (selected) {
        setPendingLetter(selected)
        setConfirmTapCount(0)
        speak(`Pilihan ${selected}. Ketuk sekali untuk yakin, dua kali untuk pilih ulang.`)
      }
    }, 1200)
  }, [
    x,
    pendingSubmitConfirm,
    submitTapCount,
    pendingLetter,
    confirmTapCount,
    tapCount,
    choose,
  ])

  function handleTouchEnd(e: React.TouchEvent) {
    if (x.phase !== 'question') return
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!touchStartRef.current) return
    const start = touchStartRef.current
    touchStartRef.current = null

    const touchCount = start.touches
    const changeX = (e.changedTouches[0]?.clientX ?? start.x) - start.x
    const changeY = (e.changedTouches[0]?.clientY ?? start.y) - start.y
    const distance = Math.hypot(changeX, changeY)

    // Gesture 1: Ketuk dua jari = Ulangi Soal (PRD F-04b)
    if (touchCount === 2 && distance < 20) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
      setTapCount(0)
      playBeep()
      readQuestion()
      return
    }

    // Gesture 2: Swipe Horisontal (Geser Kiri / Geser Kanan)
    if (distance > 50 && Math.abs(changeX) > Math.abs(changeY)) {
      if (changeX < -50) {
        // Geser kiri = soal sebelumnya
        playBeep()
        speak('Soal sebelumnya.')
        prev()
        return
      } else if (changeX > 50) {
        // Geser kanan = soal berikutnya atau konfirmasi kirim pada soal terakhir
        playBeep()
        if (x.index === total - 1) {
          setPendingSubmitConfirm(true)
          setSubmitTapCount(0)
          speak('Semua soal selesai. Ketuk sekali untuk kirim jawaban, ketuk dua kali untuk batal.')
        } else {
          speak('Soal berikutnya.')
          next()
        }
        return
      }
    }

    // Gesture 3: Ketukan satu jari (Tap-to-Answer & Konfirmasi) di mana saja di layar
    if (touchCount === 1 && distance < 25 && x.phase === 'question') {
      touchFiredRef.current = true
      registerTap()
      setTimeout(() => {
        touchFiredRef.current = false
      }, 300)
    }
  }

  // Fallback for Desktop Mouse Clicks when Tap Mode is active
  function handleContainerClick(e: React.MouseEvent) {
    if (x.phase !== 'question') return
    if (touchFiredRef.current) return
    // Ignore clicks on header buttons/links so user can still toggle/navigate
    if ((e.target as HTMLElement).closest('header')) return
    if (tapMode && x.phase === 'question') {
      registerTap()
    }
  }

  function handleNameSubmit(e?: React.FormEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmed = nameInput.trim()
    if (!trimmed) {
      speak('Nama belum diisi. Silakan sebutkan atau ketik nama Anda.')
      return
    }
    x.confirmName(trimmed)
  }

  function handlePinSubmit(e?: React.FormEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const clean = pinInput.trim().replace(/\D/g, '')
    if (clean.length !== 4) {
      speak('PIN harus empat angka.')
      return
    }
    x.loadPin(clean)
  }

  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-black text-balance text-white md:text-6xl">
      {text}
    </h1>
  )

  return (
    <div
      className="flex min-h-dvh flex-col bg-black text-white select-none touch-manipulation cursor-pointer"
      data-state={x.phase}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >
      <header className="flex items-center justify-between gap-4 border-b-4 border-[#FFE600] px-6 py-4">
        <Link
          href="/tunanetra"
          className="inline-flex min-h-12 items-center gap-2 text-lg font-bold text-[#FFE600] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-5" aria-hidden="true" /> Portal tunanetra
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTapMode}
            aria-pressed={tapMode}
            className={cn(
              hcBtn,
              'flex items-center gap-2 text-base md:text-lg min-h-12 px-4',
              tapMode ? 'bg-[#FFE600] text-black font-black' : 'text-white border-white/60',
            )}
            title="Tekan T untuk toggle mode ketuk"
          >
            <Hand className="size-5" aria-hidden="true" />
            <span>{tapMode ? 'Mode Ketuk (Aktif)' : 'Mode Ketuk'}</span>
            <span className="hidden md:inline">(T)</span>
          </button>
          <button
            type="button"
            onClick={toggleVoiceMode}
            className={cn(
              hcBtn,
              'flex items-center gap-2 text-base md:text-lg min-h-12 px-4',
              voice.active && 'bg-[#FFE600] text-black',
            )}
            aria-pressed={voice.active}
            title="Tekan V untuk menyalakan atau mematikan mode suara"
          >
            <Mic className={cn('size-5', voice.listening && 'animate-pulse')} aria-hidden="true" />
            <span>{voice.listening ? 'Mendengarkan…' : voice.active ? 'Mode Suara Aktif' : 'Mode Suara'}</span>
            <span className="hidden md:inline">(V)</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-12">
        <p className="sr-only" aria-live="polite">
          {hint}
        </p>
        {hint && (
          <p
            aria-hidden="true"
            className="text-lg font-bold text-[#FFE600] bg-neutral-900 border border-[#FFE600] rounded-xl px-4 py-2"
          >
            {hint}
          </p>
        )}

        {/* Status Mode Ketuk Banner (PRD F-04b) */}
        {tapMode && x.phase === 'question' && (
          <div className="rounded-2xl border-4 border-[#FFE600] bg-[#FFE600]/10 p-4 text-center">
            <span className="text-xl font-black text-[#FFE600] block">
              MODE CADANGAN KETUK &amp; GESER AKTIF
            </span>
            <span className="text-sm font-semibold text-white/90">
              Ketuk 1x=A · 2x=B · 3x=C · 4x=D · Ketuk 2 Jari=Ulang Soal · Geser Kiri/Kanan=Navigasi
            </span>
          </div>
        )}

        {x.phase === 'name' && (
          <form
            onSubmit={handleNameSubmit}
            action="javascript:void(0);"
            className="flex flex-col gap-6"
          >
            {heading('Siapa nama Anda?')}
            <p className="text-base text-white/80">
              Sebutkan nama lewat mikrofon (tekan V untuk mode suara), atau ketik nama lalu tekan Enter.
            </p>
            <label htmlFor="nama" className="sr-only">
              Nama siswa
            </label>
            <input
              id="nama"
              autoFocus
              autoComplete="name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={hcInput}
              placeholder="Nama lengkap siswa"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleNameSubmit()}
                className={cn(hcBtn, 'flex-1 bg-[#FFE600] text-black')}
              >
                Lanjut ke PIN
              </button>
              <button
                type="button"
                onClick={() => !voice.active && toggleVoiceMode()}
                className={cn(hcBtn, 'flex items-center justify-center gap-2', voice.active && 'bg-white text-black')}
              >
                <Mic className="size-6 text-current" aria-hidden="true" />
                <span>{voice.listening ? 'Mendengarkan…' : voice.active ? 'Mode suara aktif' : 'Bicara Nama'}</span>
              </button>
            </div>
          </form>
        )}

        {x.phase === 'pin' && (
          <form
            onSubmit={handlePinSubmit}
            action="javascript:void(0);"
            className="flex flex-col gap-6"
          >
            {heading('Masukkan PIN ujian')}
            <p className="text-base text-white/80">Ketik 4 digit PIN ujian dari guru.</p>
            <label htmlFor="pin" className="sr-only">
              PIN ujian empat angka
            </label>
            <input
              id="pin"
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className={cn(hcInput, 'text-center font-mono text-5xl tracking-[0.5em]')}
              placeholder="0000"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handlePinSubmit()}
                className={cn(hcBtn, 'flex-1 bg-[#FFE600] text-black')}
              >
                Mulai Ujian
              </button>
              <button
                type="button"
                onClick={() => !voice.active && toggleVoiceMode()}
                className={cn(hcBtn, 'flex items-center justify-center gap-2', voice.active && 'bg-white text-black')}
              >
                <Mic className="size-6 text-current" aria-hidden="true" />
                <span>{voice.listening ? 'Mendengarkan…' : voice.active ? 'Mode suara aktif' : 'Sebutkan PIN'}</span>
              </button>
            </div>
          </form>
        )}

        {(x.phase === 'loading' || x.phase === 'submitting') && (
          <div role="status">{heading(x.phase === 'loading' ? 'Memuat ujian…' : 'Mengirim jawaban…')}</div>
        )}

        {x.phase === 'question' && q && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-[#FFE600]">
                Soal {x.index + 1} dari {total}
              </p>
              {pendingLetter && (
                <span className="rounded-lg bg-[#FFE600] px-3 py-1 text-sm font-black text-black animate-pulse">
                  Konfirmasi Pilihan {pendingLetter}…
                </span>
              )}
            </div>

            {heading(q.text)}

            <fieldset>
              <legend className="sr-only">Pilihan jawaban</legend>
              <ul className="flex flex-col gap-3">
                {LETTERS.map((l) => {
                  const active = x.answers[q.id] === l
                  const isPending = pendingLetter === l
                  return (
                    <li key={l}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(l, true)}
                        className={cn(
                          hcBtn,
                          'flex w-full items-center gap-4 text-left transition-all',
                          active && 'bg-[#FFE600] text-black font-black',
                          isPending && 'ring-4 ring-white ring-offset-2 ring-offset-black',
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border-4 border-current">
                          {l}
                        </span>
                        <span className="flex-1">{q.options[l]}</span>
                        {active && <span className="text-sm font-bold">(Tersimpan)</span>}
                        {isPending && <span className="text-sm font-bold text-black">(Yakin?)</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <button type="button" onClick={prev} disabled={x.index === 0} className={hcBtn}>
                Kembali <span className="hidden md:inline">(P)</span>
              </button>
              <button type="button" onClick={readQuestion} className={hcBtn}>
                Ulang <span className="hidden md:inline">(Spasi)</span>
              </button>
              <button type="button" onClick={next} className={hcBtn}>
                {x.index === total - 1 ? 'Selesai' : 'Lanjut'} <span className="hidden md:inline">(N)</span>
              </button>
            </div>
          </section>
        )}

        {x.phase === 'review' && (
          <section className="flex flex-col gap-6">
            {heading(`${answeredCount} dari ${total} soal terjawab`)}
            {answeredCount < total && (
              <p className="text-xl text-white/80">Soal yang kosong akan dihitung salah.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={prev} className={hcBtn}>
                Periksa lagi <span className="hidden md:inline">(P)</span>
              </button>
              <button type="button" onClick={x.submit} className={cn(hcBtn, 'bg-[#FFE600] text-black')}>
                Kirim jawaban <span className="hidden md:inline">(Enter)</span>
              </button>
            </div>
          </section>
        )}

        {x.phase === 'result' && x.result && (
          <section className="flex flex-col gap-6">
            {heading(`Nilai Anda ${x.result.score}`)}
            <p className="text-2xl">
              Benar {x.result.correctCount} dari {x.result.totalQuestions} soal. Terima kasih, {x.name}.
            </p>
            <button type="button" onClick={x.reset} className={hcBtn}>
              Ujian lain <span className="hidden md:inline">(Enter)</span>
            </button>
          </section>
        )}

        {x.phase === 'error' && x.error && (
          <section role="alert" className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              {x.error.code === 'NETWORK' && <WifiOff className="size-8 text-[#FFE600]" aria-hidden="true" />}
              {heading(x.error.code === 'NETWORK' ? 'Koneksi terputus' : 'Tidak bisa melanjutkan')}
            </div>
            <p className="text-2xl">{x.error.message}</p>
            <p className="text-lg text-white/70">
              {x.error.code === 'NETWORK'
                ? 'Jawaban Anda telah tersimpan aman di perangkat. Sistem akan mengirim otomatis saat koneksi kembali.'
                : 'Silakan periksa kembali atau coba beberapa saat lagi.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={x.retry} className={cn(hcBtn, 'bg-[#FFE600] text-black')}>
                Kirim ulang sekarang <span className="hidden md:inline">(Enter)</span>
              </button>
              <button type="button" onClick={x.reset} className={hcBtn}>
                Mulai dari awal
              </button>
            </div>
          </section>
        )}
      </main>

      {x.phase === 'question' && (
        <footer className="border-t-4 border-[#FFE600] px-6 py-4 text-center text-base md:text-lg text-white/80">
          <div>Katakan: &ldquo;Jawab, B&rdquo; · &ldquo;Ulangi soal&rdquo; · &ldquo;Selesai ujian&rdquo;</div>
          <div className="hidden md:block mt-1 text-sm text-white/60">
            Keyboard: A–D jawab · Spasi ulang · N lanjut · P kembali · T mode ketuk
          </div>
        </footer>
      )}
    </div>
  )
}
