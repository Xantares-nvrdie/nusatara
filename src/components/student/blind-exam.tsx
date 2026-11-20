'use client'

import { ArrowLeft, Hand, Mic, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getRecognition, playBeep, speak, stopSpeaking } from '@/lib/speech'
import { LETTERS, type Letter } from '@/lib/types'
import { useExamAttempt } from '@/lib/use-exam-attempt'
import { type VoiceStopReason, useVoiceMode } from '@/lib/use-voice-mode'
import { cn } from '@/lib/utils'
import { command, parseAnswer, parseDigits, parseName } from '@/lib/voice-commands'

type Phase = ReturnType<typeof useExamAttempt>['phase']

const TAP_INSTRUCTIONS =
  'Mode ketuk aktif. Ketuk satu kali untuk A, dua kali untuk B, tiga kali untuk C, atau empat kali untuk D, lalu ketuk sekali lagi jika yakin. Ketuk dua jari untuk ulangi soal. Geser kiri untuk kembali, geser kanan untuk lanjut. Tahan layar dua detik untuk keluar dari mode ketuk. Tombol kembali ke mode suara ada di pojok kanan atas layar.'

const VOICE_CONFIRM_HINT = 'Katakan: Ya, jika yakin. Atau: Tidak, untuk memilih ulang.'

/** Best effort: browsers refuse fullscreen without a user gesture, and iPhone Safari doesn't support it. */
function enterFullscreen() {
  if (typeof document === 'undefined' || document.fullscreenElement) return
  document.documentElement.requestFullscreen?.().catch(() => {})
}

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
  'min-h-14 sm:min-h-16 rounded-2xl border-4 border-[#FFE600] px-4 py-3 sm:px-6 text-base sm:text-xl font-black text-[#FFE600] transition-colors hover:bg-[#FFE600] hover:text-black focus-visible:bg-[#FFE600] focus-visible:text-black focus-visible:outline-[4px] focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-50'
const hcInput =
  'min-h-14 sm:min-h-16 w-full rounded-2xl border-4 border-[#FFE600] bg-black px-4 sm:px-5 text-xl sm:text-2xl font-bold text-white placeholder:text-white/50 focus-visible:outline-[4px] focus-visible:outline-offset-4 focus-visible:outline-white'

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
  /** Set when a 2 s hold switched the mode, so lifting that finger isn't also counted as a tap. */
  const longPressFiredRef = useRef(false)
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
    if (x.phase === 'question') enterFullscreen()
  }, [x.phase])

  /** Drops a half-entered answer (tap count, unconfirmed choice, submit prompt) and its timers. */
  const resetPending = useCallback(() => {
    for (const timer of [tapTimerRef, confirmTapTimerRef, submitTapTimerRef]) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
    setTapCount(0)
    setPendingLetter(null)
    setConfirmTapCount(0)
    setPendingSubmitConfirm(false)
    setSubmitTapCount(0)
  }, [])

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
    // A choice left unconfirmed on the previous question or step must not carry over.
    resetPending()
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
    } else {
      const promptText = prompts[x.phase]
      if (promptText) speak(promptText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x.phase, x.index, resetPending])

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
      speak(
        autoAdvance && x.index < total - 1
          ? `Jawaban ${l} tersimpan, lanjut ke soal berikutnya.`
          : `Jawaban ${l} tersimpan.`,
      )
      if (autoAdvance) {
        // Voice mode must not listen in this gap, or the next answer would land on this question.
        advancingRef.current = true
        setTimeout(() => {
          advancingRef.current = false
          next()
        }, 1200)
      }
    },
    [q, x, total, next],
  )

  /**
   * Voice and tap answers are only a proposal: repeat the option and ask before saving, so a misheard word or a
   * miscounted tap never becomes an answer (PRD F-04, F-04b). Keyboard and on-screen buttons save directly.
   */
  const askConfirm = useCallback(
    (l: Letter, via: 'voice' | 'tap') => {
      if (!q) return
      setPendingLetter(l)
      setConfirmTapCount(0)
      speak(
        `Anda memilih ${l}, ${q.options[l]}. Apakah Anda yakin? ${
          via === 'voice' ? VOICE_CONFIRM_HINT : 'Ketuk sekali jika yakin, dua kali untuk pilih ulang.'
        }`,
      )
    },
    [q],
  )

  // Toggle Tap Fallback Mode (PRD F-04b). `reason` explains why voice mode had to give up first.
  const activateTapMode = useCallback((reason?: string) => {
    resetPending()
    setTapMode(true)
    enterFullscreen()
    playBeep()
    setHint(reason ? `${reason} Mode ketuk aktif.` : 'Mode ketuk aktif (F-04b)')
    speak(reason ? `${reason} ${TAP_INSTRUCTIONS}` : TAP_INSTRUCTIONS)
  }, [resetPending])

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
      if (pendingLetter) return handleConfirmReply(text, pendingLetter)
      // An explicit "Jawab B" wins over everything else in the sentence.
      const explicit = /\b(jawab|jawaban|jawabannya|pilih|pilihan|opsi)\b/i.test(text) ? parseAnswer(text, q.options) : null
      if (explicit) return askConfirm(explicit, 'voice')
      // The mic is always on in voice mode, so a stray "selesai" only opens the summary; "Kirim" there submits.
      if (command.finish(text)) return x.setPhase('review')
      if (command.repeat(text)) return readQuestion()
      if (command.next(text)) return next()
      if (command.prev(text)) return x.index === 0 ? speak('Ini soal pertama.') : prev()
      const answer = parseAnswer(text, q.options)
      if (answer) return askConfirm(answer, 'voice')
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

  // The reply to "Apakah Anda yakin?" in voice mode. Only "ya" saves; anything unclear asks again.
  function handleConfirmReply(text: string, pending: Letter) {
    // Letters only, without option text: an option such as "Benar" must not read as a new choice.
    const said = parseAnswer(text)
    const switched = said && said !== pending ? said : null
    // "Tidak yakin" contains "yakin", so a no wins over a yes.
    if (command.no(text)) {
      if (switched) return askConfirm(switched, 'voice')
      setPendingLetter(null)
      return speak('Baik, silakan pilih ulang. Katakan: Jawab A, B, C, atau D. Atau: Ulangi soal.')
    }
    if (switched) return askConfirm(switched, 'voice')
    if (command.yes(text)) return choose(pending, true)
    if (command.repeat(text)) {
      setPendingLetter(null)
      return readQuestion()
    }
    if (command.finish(text)) return x.setPhase('review')
    if (command.next(text)) return next()
    if (command.prev(text)) return x.index === 0 ? speak('Ini soal pertama.') : prev()
    if (said === pending) return askConfirm(pending, 'voice')
    speak(`Jawaban ${pending} belum disimpan. ${VOICE_CONFIRM_HINT}`)
  }

  // Hands-free voice mode: one press (button or V) keeps it listening after every spoken prompt.
  const voice = useVoiceMode({
    canListen: () => !tapMode && !advancingRef.current && Boolean(VOICE_STEP_HINT[x.phase]),
    onTranscript: handleTranscript,
    onStop: (reason) => activateTapMode(VOICE_STOP_MESSAGE[reason]),
  })

  voiceOnRef.current = voice.active

  function toggleVoiceMode() {
    resetPending()
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
      resetPending()
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

  function cancelLongPress() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = null
  }

  // Touch Start Handler: detect multi-touch and initiate long-press (2s)
  function handleTouchStart(e: React.TouchEvent) {
    if (x.phase !== 'question') return
    const touches = e.touches.length
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), touches }

    // Tahan layar 2 detik: switches tap mode on, or off again (PRD F-04b).
    cancelLongPress()
    longPressFiredRef.current = false
    // In tap mode the voice-mode button handles its own touch; it must not also count as a tap, swipe or hold.
    if (tapMode && (e.target as HTMLElement).closest('button')) {
      touchStartRef.current = null
      return
    }
    if (touches === 1) {
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        longPressFiredRef.current = true
        toggleTapRef.current()
      }, 2000)
    }
  }

  // A finger that moves is swiping or scrolling, not holding.
  function handleTouchMove(e: React.TouchEvent) {
    const start = touchStartRef.current
    const t = e.touches[0]
    if (start && t && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 25) cancelLongPress()
  }

  // The browser took over the touch (e.g. scrolling a long question): no tap, no swipe, no hold.
  function handleTouchCancel() {
    cancelLongPress()
    touchStartRef.current = null
  }

  const touchFiredRef = useRef(false)
  /** Touch is followed by an emulated mouse click; skip it so one tap doesn't count twice. */
  function suppressNextClick() {
    touchFiredRef.current = true
    setTimeout(() => {
      touchFiredRef.current = false
    }, 300)
  }

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
      if (selected) askConfirm(selected, 'tap')
    }, 1200)
  }, [
    x,
    pendingSubmitConfirm,
    submitTapCount,
    pendingLetter,
    confirmTapCount,
    tapCount,
    choose,
    askConfirm,
  ])

  function handleTouchEnd(e: React.TouchEvent) {
    if (x.phase !== 'question') return
    cancelLongPress()
    const start = touchStartRef.current
    touchStartRef.current = null
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      suppressNextClick()
      return
    }
    // Outside tap mode the screen has buttons; a touch on one must not also count as a tap answer.
    if (!start || !tapMode) return

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
      suppressNextClick()
      registerTap()
    }
  }

  // A hold swaps the layout while the finger is still down, so the touched element can vanish and its touchend
  // never arrives. The browser may still send a click for that touch, landing on whatever is under the finger
  // now: in tap mode that counted as tap A, in the normal layout it could press an option button. Capture phase
  // runs before any button handler, so the click is dropped here.
  // The click emulated after a counted tap would count it twice. A click on a control comes from a touch on that
  // control, which isn't counted, so it stays (a quick tap then a press on "Mode Suara" must still work).
  function swallowGhostClick(e: React.MouseEvent) {
    const onControl = Boolean((e.target as HTMLElement).closest('button, a'))
    if (!longPressFiredRef.current && !(touchFiredRef.current && !onControl)) return
    longPressFiredRef.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  // Fallback for Desktop Mouse Clicks when Tap Mode is active
  function handleContainerClick(e: React.MouseEvent) {
    if (x.phase !== 'question') return
    if (touchFiredRef.current) return
    // Ignore clicks on header buttons/links so user can still toggle/navigate
    if ((e.target as HTMLElement).closest('header, button, a')) return
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
    <h1
      ref={headingRef}
      tabIndex={-1}
      className="text-2xl sm:text-4xl font-black leading-snug text-balance break-words text-white md:text-5xl"
    >
      {text}
    </h1>
  )

  // Tap mode (PRD F-04b): the whole screen is one tap surface showing only the question. No option or
  // navigation buttons, so a tap can't land on a control by accident; options are read aloud instead. The one
  // control is the way back to voice mode, kept in the top corner away from where students tap.
  if (tapMode && x.phase === 'question' && q) {
    const saved = x.answers[q.id]
    const confirming = Boolean(pendingLetter || pendingSubmitConfirm)
    const status = pendingSubmitConfirm
      ? 'Kirim jawaban? Ketuk 1x = kirim · 2x = batal'
      : pendingLetter
        ? `Pilihan ${pendingLetter}. Yakin? Ketuk 1x = yakin · 2x = pilih ulang`
        : tapCount > 0
          ? `${tapCount} ketukan = ${LETTERS[Math.min(tapCount, LETTERS.length) - 1]}`
          : saved
            ? `Jawaban tersimpan: ${saved}`
            : 'Ketuk layar untuk menjawab'
    return (
      <div
        className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-black px-5 py-6 text-white select-none touch-pan-y cursor-pointer [-webkit-touch-callout:none] sm:px-10 sm:py-10"
        data-state={x.phase}
        data-mode="tap"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClickCapture={swallowGhostClick}
        onClick={handleContainerClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <header className="flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-[#FFE600] sm:text-2xl">
            Soal {x.index + 1} dari {total}
          </p>
          <button
            type="button"
            onClick={toggleVoiceMode}
            className={cn(hcBtn, 'flex min-h-12 shrink-0 items-center gap-2 px-4 py-2.5 text-base sm:text-lg')}
            title="Tekan V untuk kembali ke mode suara"
          >
            <Mic className="size-5 shrink-0" aria-hidden="true" />
            <span>Mode Suara</span>
            <span className="hidden md:inline">(V)</span>
          </button>
        </header>
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center py-8">{heading(q.text)}</div>
        {/* Spoken feedback already covers this; the text is for a teacher or helper looking at the screen. */}
        <p
          aria-hidden="true"
          className={cn(
            'rounded-2xl border-4 border-[#FFE600] px-4 py-3 text-center text-lg font-black sm:text-2xl',
            confirming ? 'bg-[#FFE600] text-black' : 'text-[#FFE600]',
          )}
        >
          {status}
        </p>
        <p aria-hidden="true" className="mt-3 text-center text-xs text-white/60 sm:text-sm">
          Ketuk 1x=A · 2x=B · 3x=C · 4x=D · 2 jari = ulang soal · geser = pindah soal · tahan 2 detik = keluar
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-dvh w-full overflow-x-hidden flex-col bg-black text-white select-none touch-manipulation cursor-pointer"
      data-state={x.phase}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClickCapture={swallowGhostClick}
      onClick={handleContainerClick}
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-4 border-[#FFE600] px-4 py-3.5 sm:px-6 sm:py-4">
        <Link
          href="/tunanetra"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-base sm:text-lg font-bold text-[#FFE600] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-5 shrink-0" aria-hidden="true" />
          <span>Portal tunanetra</span>
        </Link>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleTapMode}
            aria-pressed={tapMode}
            className={cn(
              hcBtn,
              'flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg min-h-12 px-3 py-2.5 sm:px-4',
              tapMode ? 'bg-[#FFE600] text-black font-black' : 'text-white border-white/60',
            )}
            title="Tekan T untuk toggle mode ketuk"
          >
            <Hand className="size-4 sm:size-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{tapMode ? 'Ketuk: Aktif' : 'Mode Ketuk'}</span>
            <span className="hidden md:inline">(T)</span>
          </button>
          <button
            type="button"
            onClick={toggleVoiceMode}
            className={cn(
              hcBtn,
              'flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg min-h-12 px-3 py-2.5 sm:px-4',
              voice.active && 'bg-[#FFE600] text-black',
            )}
            aria-pressed={voice.active}
            title="Tekan V untuk menyalakan atau mematikan mode suara"
          >
            <Mic className={cn('size-4 sm:size-5 shrink-0', voice.listening && 'animate-pulse')} aria-hidden="true" />
            <span className="truncate">
              {voice.listening ? 'Mendengar…' : voice.active ? 'Suara: Aktif' : 'Mode Suara'}
            </span>
            <span className="hidden md:inline">(V)</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 sm:gap-8 px-4 py-6 sm:px-6 sm:py-12">
        <p className="sr-only" aria-live="polite">
          {hint}
        </p>
        {hint && (
          <p
            aria-hidden="true"
            className="text-base sm:text-lg font-bold text-[#FFE600] bg-neutral-900 border-2 border-[#FFE600] rounded-xl px-4 py-2.5 break-words"
          >
            {hint}
          </p>
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
              className={cn(hcInput, 'text-center font-mono text-3xl sm:text-5xl tracking-[0.35em] sm:tracking-[0.5em]')}
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
          <section className="flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg sm:text-xl font-bold text-[#FFE600]">
                Soal {x.index + 1} dari {total}
              </p>
              {pendingLetter && (
                <span className="rounded-lg bg-[#FFE600] px-3 py-1 text-xs sm:text-sm font-black text-black animate-pulse">
                  Konfirmasi Pilihan {pendingLetter}…
                </span>
              )}
            </div>

            {heading(q.text)}

            <fieldset className="min-w-0">
              <legend className="sr-only">Pilihan jawaban</legend>
              <ul className="flex flex-col gap-3">
                {LETTERS.map((l) => {
                  const active = x.answers[q.id] === l
                  const isPending = pendingLetter === l
                  return (
                    <li key={l} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(l, true)}
                        className={cn(
                          hcBtn,
                          'flex w-full min-w-0 items-start sm:items-center gap-3 sm:gap-4 text-left transition-all',
                          active && 'bg-[#FFE600] text-black font-black',
                          isPending && 'ring-4 ring-white ring-offset-2 ring-offset-black',
                        )}
                      >
                        <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg border-4 border-current text-base sm:text-xl">
                          {l}
                        </span>
                        <span className="min-w-0 flex-1 break-words leading-snug">{q.options[l]}</span>
                        {active && <span className="shrink-0 text-xs sm:text-sm font-bold">(Tersimpan)</span>}
                        {isPending && <span className="shrink-0 text-xs sm:text-sm font-bold text-black">(Yakin?)</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={prev}
                disabled={x.index === 0}
                className={cn(hcBtn, 'px-2 sm:px-6 text-sm sm:text-xl')}
              >
                Kembali <span className="hidden md:inline">(P)</span>
              </button>
              <button
                type="button"
                onClick={readQuestion}
                className={cn(hcBtn, 'px-2 sm:px-6 text-sm sm:text-xl')}
              >
                Ulang <span className="hidden md:inline">(Spasi)</span>
              </button>
              <button
                type="button"
                onClick={next}
                className={cn(hcBtn, 'px-2 sm:px-6 text-sm sm:text-xl')}
              >
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
        <footer className="border-t-4 border-[#FFE600] px-4 py-3.5 sm:px-6 sm:py-4 text-center text-sm sm:text-base md:text-lg text-white/80">
          {pendingLetter ? (
            <div>
              Pilihan {pendingLetter} belum tersimpan. Katakan: &ldquo;Ya&rdquo; jika yakin · &ldquo;Tidak&rdquo; untuk
              pilih ulang
            </div>
          ) : (
            <div>Katakan: &ldquo;Jawab, B&rdquo; · &ldquo;Ulangi soal&rdquo; · &ldquo;Selesai ujian&rdquo;</div>
          )}
          <div className="hidden md:block mt-1 text-sm text-white/60">
            Keyboard: A–D jawab · Spasi ulang · N lanjut · P kembali · T mode ketuk
          </div>
        </footer>
      )}
    </div>
  )
}
