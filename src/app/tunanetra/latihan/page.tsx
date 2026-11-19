'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'
import { api, ApiError } from '@/lib/api'
import { getRecognition, speak, stopSpeaking } from '@/lib/speech'
import { LETTERS, type Letter } from '@/lib/types'

/** Item of GET /api/practice. Practice is ungraded, so the answer key and explanation come with it. */
interface PracticeItem {
  id: string
  moduleId: string
  moduleTitle: string
  question: string
  options: Record<Letter, string>
  correctAnswer: Letter
  explanation: string
}

interface PracticeQuestion {
  id: string
  moduleTitle: string
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

type LoadStatus = 'loading' | 'error' | 'empty' | 'ready'

const PRACTICE_LIMIT = 10
const ORDINALS = ['pertama', 'kedua', 'ketiga', 'keempat']
// How id-ID speech recognition may write a spoken option letter.
const SPOKEN_LETTERS = new Map([
  ['a', 0],
  ['b', 1],
  ['be', 1],
  ['c', 2],
  ['ce', 2],
  ['d', 3],
  ['de', 3],
])

// Shared helper: Indonesian voice, and stays silent while the tab is in the background.
function speakText(text: string) {
  speak(text, { rate: 0.95 })
}

function toQuestion(item: PracticeItem): PracticeQuestion {
  return {
    id: item.id,
    moduleTitle: item.moduleTitle,
    question: item.question,
    options: LETTERS.map((l) => item.options[l]),
    answerIndex: LETTERS.indexOf(item.correctAnswer),
    explanation: item.explanation,
  }
}

function loadErrorMessage(err: unknown) {
  // api() throws ApiError with the HTTP status; a request that never reached the server has no status.
  if (err instanceof ApiError && err.status !== undefined) return `Soal latihan gagal dimuat. ${err.message}`
  return 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.'
}

/** Option index for a spoken answer: the option text, a letter (A–D) or an ordinal word. -1 when nothing matches. */
function matchSpokenOption(transcript: string, options: string[]) {
  const t = transcript.toLowerCase().trim()
  const exact = options.findIndex((opt) => opt.toLowerCase() === t)
  if (exact >= 0) return exact
  const letter = t.split(/[^a-z]+/).find((w) => SPOKEN_LETTERS.has(w))
  if (letter) return SPOKEN_LETTERS.get(letter) ?? -1
  const ordinal = ORDINALS.findIndex((w) => t.includes(w))
  if (ordinal >= 0) return ordinal
  return options.findIndex((opt) => t.includes(opt.toLowerCase()))
}

export default function LatihanSuaraPage() {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [speechFeedback, setSpeechFeedback] = useState('')
  const [finished, setFinished] = useState(false)

  // Bumped on every load and on unmount, so a late response never replaces a newer set or speaks on another page.
  const requestRef = useRef(0)
  const recognitionRef = useRef<ReturnType<typeof getRecognition>>(null)
  const retryRef = useRef<HTMLButtonElement>(null)

  const total = questions.length
  const currentQ = status === 'ready' ? questions[currentIdx] : undefined

  // Fetches a new random set and starts from the first question.
  const loadQuestions = useCallback(async () => {
    requestRef.current += 1
    const requestId = requestRef.current
    recognitionRef.current?.abort()
    setStatus('loading')
    setQuestions([])
    setCurrentIdx(0)
    setSelectedOpt(null)
    setIsAnswered(false)
    setScore(0)
    setFinished(false)
    setSpeechFeedback('')
    speakText('Memuat soal latihan.')

    try {
      const { items } = await api<{ items: PracticeItem[] }>(`/practice?limit=${PRACTICE_LIMIT}`)
      if (requestId !== requestRef.current) return
      setQuestions(items.map(toQuestion))
      if (items.length > 0) {
        setStatus('ready')
      } else {
        setStatus('empty')
        speakText('Belum ada soal latihan dari guru.')
      }
    } catch (err) {
      if (requestId !== requestRef.current) return
      const message = loadErrorMessage(err)
      setErrorMsg(message)
      setStatus('error')
      speakText(`${message} Tekan tombol Coba lagi.`)
    }
  }, [])

  // Load the first set. Leaving the page stops reading, the microphone and any pending request.
  useEffect(() => {
    void loadQuestions()
    return () => {
      requestRef.current += 1
      recognitionRef.current?.abort()
      stopSpeaking()
    }
  }, [loadQuestions])

  // Put keyboard focus on "Coba lagi" so Enter or Space retries right away.
  useEffect(() => {
    if (status === 'error') retryRef.current?.focus()
  }, [status])

  // Read each question once it is on screen (only after the set has loaded).
  useEffect(() => {
    if (finished || !currentQ) return
    speakText(
      `Soal nomor ${currentIdx + 1}. ${currentQ.question}. Pilihan A: ${currentQ.options[0]}. Pilihan B: ${currentQ.options[1]}. Pilihan C: ${currentQ.options[2]}. Pilihan D: ${currentQ.options[3]}. Tekan tombol A, B, C, atau D pada keyboard untuk menjawab.`,
    )
  }, [currentQ, currentIdx, finished])

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (finished || !currentQ) return
      // Leave browser shortcuts such as Ctrl/Cmd+R and Ctrl/Cmd+C alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toUpperCase()
      if (['A', 'B', 'C', 'D'].includes(key) && !isAnswered) {
        handleAnswer(key.charCodeAt(0) - 65)
      } else if (key === 'R' || e.code === 'Space') {
        e.preventDefault()
        speakText(`Mengulang soal: ${currentQ.question}.`)
      } else if (key === 'V') {
        e.preventDefault()
        startVoiceRecognition()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIdx, isAnswered, finished, currentQ])

  function handleAnswer(index: number) {
    if (isAnswered || !currentQ) return
    // A late voice result must not answer the same question twice.
    recognitionRef.current?.abort()
    setSelectedOpt(index)
    setIsAnswered(true)

    if (index === currentQ.answerIndex) {
      setScore((prev) => prev + 1)
      speakText(`Hebat! Jawaban Anda benar. ${currentQ.explanation}. Tekan tombol lanjut untuk ke soal berikutnya.`)
    } else {
      const correctLetter = LETTERS[currentQ.answerIndex]
      speakText(
        `Jawaban belum tepat. Jawaban yang benar adalah pilihan ${correctLetter}, yaitu ${currentQ.options[currentQ.answerIndex]}. ${currentQ.explanation}. Tekan tombol lanjut.`,
      )
    }
  }

  function handleNext() {
    if (currentIdx + 1 < total) {
      setCurrentIdx((prev) => prev + 1)
      setSelectedOpt(null)
      setIsAnswered(false)
      setSpeechFeedback('')
    } else {
      setFinished(true)
      // `score` already counts the last answer: handleAnswer adds the point right away.
      speakText(`Latihan selesai! Anda berhasil menjawab ${score} dari ${total} pertanyaan dengan benar. Selamat!`)
    }
  }

  function startVoiceRecognition() {
    const q = currentQ
    if (!q) return
    const recognition = getRecognition()
    if (!recognition) {
      speakText('Peramban Anda belum mendukung pengenalan suara. Silakan gunakan tombol keyboard A sampai D.')
      return
    }

    // Don't let the microphone pick up the question being read aloud.
    stopSpeaking()
    recognitionRef.current?.abort()
    recognitionRef.current = recognition
    setIsListening(true)
    setSpeechFeedback('Mendengarkan suara Anda...')

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      setSpeechFeedback(`Suara terdeteksi: "${transcript}"`)
      const optIdx = matchSpokenOption(transcript, q.options)
      if (optIdx >= 0) {
        handleAnswer(optIdx)
      } else {
        speakText(`Tidak mengenali pilihan dari kata ${transcript}. Silakan sebutkan A, B, C, atau D.`)
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      // We abort the microphone ourselves after an answer or when leaving the page; that isn't a failure.
      if (event.error !== 'aborted') setSpeechFeedback('Suara tidak terdengar jelas.')
    }

    recognition.onend = () => {
      setIsListening(false)
      if (recognitionRef.current === recognition) recognitionRef.current = null
    }

    try {
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Info */}
        <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
              <Headphones className="size-3.5" />
              Latihan Mandiri Interaktif
            </span>
            <span className="text-xs text-white/70">
              Pintasan Keyboard: <strong>A, B, C, D</strong> | Ulang: <strong>Spasi/R</strong> | Bicara: <strong>V</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black md:text-3xl">Kuis Suara Tanpa Layar</h1>
          <p className="text-sm text-neutral-300">
            Dengarkan pertanyaan dan jawab langsung menggunakan suara atau keyboard. Umpan balik audio akan langsung dibacakan.
          </p>
        </div>

        {status === 'loading' && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-3xl border border-black/10 bg-white p-10 text-center shadow-md"
          >
            <Loader2 className="size-5 animate-spin text-neutral-700" aria-hidden="true" />
            <p className="text-base font-bold text-neutral-700">Memuat soal latihan…</p>
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50 p-10 text-center"
          >
            <AlertCircle className="size-8 text-red-600" aria-hidden="true" />
            <p className="max-w-xl text-base font-bold text-red-950">{errorMsg}</p>
            <button
              ref={retryRef}
              type="button"
              onClick={() => void loadQuestions()}
              className={`${btnLime} px-7 py-3 text-sm`}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        )}

        {status === 'empty' && (
          <div
            role="status"
            className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center"
          >
            <p className="text-base font-semibold text-neutral-700">Belum ada soal latihan dari guru.</p>
            <button
              type="button"
              onClick={() => void loadQuestions()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-100"
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Muat ulang
            </button>
          </div>
        )}

        {status === 'ready' && finished && (
          /* Finished State */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-black/10 bg-white p-10 text-center shadow-lg">
            <div className="flex size-16 items-center justify-center rounded-full bg-lime text-black font-black text-2xl mb-4">
              ✓
            </div>
            <h2 className="text-3xl font-black text-neutral-900">Latihan Selesai!</h2>
            <p className="mt-2 text-base text-neutral-600">
              Skor Anda: <strong className="text-black font-black text-xl">{score}</strong> dari {total} soal terjawab benar.
            </p>
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => void loadQuestions()}
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-100"
              >
                <RotateCcw className="size-4" /> Latihan Lagi
              </button>
              <Link href="/tunanetra/ujian" className={`${btnLime} px-7 py-3 text-sm`}>
                Lanjut ke Ujian Resmi (PIN)
              </Link>
            </div>
          </div>
        )}

        {!finished && currentQ && (
          /* Question Box */
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-md md:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="min-w-0">
                <span className="block text-sm font-bold text-neutral-500">
                  Pertanyaan {currentIdx + 1} dari {total}
                </span>
                <span className="block truncate text-xs text-neutral-500">Dari modul: {currentQ.moduleTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => speakText(`Soal: ${currentQ.question}`)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200"
              >
                <Volume2 className="size-3.5" /> Ulang Suara
              </button>
            </div>

            <p className="text-xl md:text-2xl font-black text-neutral-900 leading-snug">
              {currentQ.question}
            </p>

            {/* Options */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              {currentQ.options.map((opt, i) => {
                const letter = LETTERS[i]
                const isSelected = selectedOpt === i
                const isCorrect = i === currentQ.answerIndex

                let btnStyle = 'border-neutral-200 hover:border-black bg-white text-neutral-900'
                if (isAnswered) {
                  if (isCorrect) btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                  else if (isSelected) btnStyle = 'border-red-500 bg-red-50 text-red-950 line-through'
                }

                return (
                  <button
                    key={letter}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleAnswer(i)}
                    className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${btnStyle}`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black font-black text-white text-sm">
                      {letter}
                    </span>
                    <span className="text-sm font-semibold">{opt}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="ml-auto size-5 text-emerald-600" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="ml-auto size-5 text-red-500" />}
                  </button>
                )
              })}
            </div>

            {/* Voice Control & Feedback */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 pt-5">
              <button
                type="button"
                onClick={startVoiceRecognition}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <Mic className="size-4" />
                {isListening ? 'Mendengarkan...' : 'Jawab Pakai Suara (V)'}
              </button>

              {speechFeedback && (
                <span className="text-xs font-medium text-neutral-600 italic">
                  {speechFeedback}
                </span>
              )}

              {isAnswered && (
                <button
                  type="button"
                  onClick={handleNext}
                  className={`${btnLime} ml-auto px-6 py-2.5 text-xs font-black uppercase`}
                >
                  <span>Lanjut</span>
                  <ArrowRight className="size-4 ml-1" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </StudentShell>
  )
}
