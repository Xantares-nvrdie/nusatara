'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Headphones, Volume2, Mic, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'

interface PracticeQuestion {
  id: number
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

const SAMPLE_QUESTIONS: PracticeQuestion[] = [
  {
    id: 1,
    question: 'Hewan yang memakan tumbuhan dan biji-bijian termasuk dalam kelompok hewan apa?',
    options: ['Karnivora', 'Herbivora', 'Omnivora', 'Insektivora'],
    answerIndex: 1,
    explanation: 'Herbivora adalah sebutan untuk hewan pemakan tumbuhan.',
  },
  {
    id: 2,
    question: 'Berapa jumlah sila dalam dasar negara kita, Pancasila?',
    options: ['Tiga sila', 'Empat sila', 'Lima sila', 'Enam sila'],
    answerIndex: 2,
    explanation: 'Pancasila terdiri dari lima sila yang menjadi pedoman hidup berbangsa.',
  },
  {
    id: 3,
    question: 'Organ tubuh manusia yang berfungsi memompa darah ke seluruh tubuh adalah?',
    options: ['Paru-paru', 'Jantung', 'Hati', 'Lambung'],
    answerIndex: 1,
    explanation: 'Jantung bertugas memompa darah yang mengandung oksigen ke seluruh tubuh.',
  },
]

export default function LatihanSuaraPage() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [speechFeedback, setSpeechFeedback] = useState('')
  const [finished, setFinished] = useState(false)

  const currentQ = SAMPLE_QUESTIONS[currentIdx]

  function speakText(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  // Speak question when loaded
  useEffect(() => {
    if (!finished && currentQ) {
      const qText = `Soal nomor ${currentIdx + 1}. ${currentQ.question}. Pilihan A: ${currentQ.options[0]}. Pilihan B: ${currentQ.options[1]}. Pilihan C: ${currentQ.options[2]}. Pilihan D: ${currentQ.options[3]}. Tekan tombol A, B, C, atau D pada keyboard untuk menjawab.`
      speakText(qText)
    }
  }, [currentIdx, finished])

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (finished) return

      const key = e.key.toUpperCase()
      if (['A', 'B', 'C', 'D'].includes(key) && !isAnswered) {
        const optIdx = key.charCodeAt(0) - 65
        handleAnswer(optIdx)
      } else if (key === 'R' || e.code === 'Space') {
        e.preventDefault()
        if (currentQ) {
          speakText(`Mengulang soal: ${currentQ.question}.`)
        }
      } else if (key === 'V') {
        e.preventDefault()
        startVoiceRecognition()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIdx, isAnswered, finished, currentQ])

  function handleAnswer(index: number) {
    if (isAnswered) return
    setSelectedOpt(index)
    setIsAnswered(true)

    const isCorrect = index === currentQ.answerIndex
    if (isCorrect) {
      setScore((prev) => prev + 1)
      speakText(`Hebat! Jawaban Anda benar. ${currentQ.explanation}. Tekan tombol lanjut untuk ke soal berikutnya.`)
    } else {
      const correctLetter = String.fromCharCode(65 + currentQ.answerIndex)
      speakText(`Jawaban belum tepat. Jawaban yang benar adalah pilihan ${correctLetter}, yaitu ${currentQ.options[currentQ.answerIndex]}. ${currentQ.explanation}. Tekan tombol lanjut.`)
    }
  }

  function handleNext() {
    if (currentIdx + 1 < SAMPLE_QUESTIONS.length) {
      setCurrentIdx((prev) => prev + 1)
      setSelectedOpt(null)
      setIsAnswered(false)
      setSpeechFeedback('')
    } else {
      setFinished(true)
      const finalScore = score + (selectedOpt === currentQ.answerIndex ? 1 : 0)
      speakText(`Latihan selesai! Anda berhasil menjawab ${finalScore} dari ${SAMPLE_QUESTIONS.length} pertanyaan dengan benar. Selamat!`)
    }
  }

  function handleRestart() {
    setCurrentIdx(0)
    setSelectedOpt(null)
    setIsAnswered(false)
    setScore(0)
    setFinished(false)
    setSpeechFeedback('')
  }

  function startVoiceRecognition() {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      speakText('Peramban Anda belum mendukung pengenalan suara. Silakan gunakan tombol keyboard A sampai D.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'id-ID'
      recognition.interimResults = false

      recognition.onstart = () => {
        setIsListening(true)
        setSpeechFeedback('Mendengarkan suara Anda...')
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        setSpeechFeedback(`Suara terdeteksi: "${transcript}"`)

        if (transcript.includes('a') || transcript.includes('pertama') || transcript.includes(currentQ.options[0].toLowerCase())) {
          handleAnswer(0)
        } else if (transcript.includes('b') || transcript.includes('kedua') || transcript.includes(currentQ.options[1].toLowerCase())) {
          handleAnswer(1)
        } else if (transcript.includes('c') || transcript.includes('ketiga') || transcript.includes(currentQ.options[2].toLowerCase())) {
          handleAnswer(2)
        } else if (transcript.includes('d') || transcript.includes('keempat') || transcript.includes(currentQ.options[3].toLowerCase())) {
          handleAnswer(3)
        } else {
          speakText(`Tidak mengenali pilihan dari kata ${transcript}. Silakan sebutkan A, B, C, atau D.`)
        }
      }

      recognition.onerror = () => {
        setIsListening(false)
        setSpeechFeedback('Suara tidak terdengar jelas.')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

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

        {finished ? (
          /* Finished State */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-black/10 bg-white p-10 text-center shadow-lg">
            <div className="flex size-16 items-center justify-center rounded-full bg-lime text-black font-black text-2xl mb-4">
              ✓
            </div>
            <h2 className="text-3xl font-black text-neutral-900">Latihan Selesai!</h2>
            <p className="mt-2 text-base text-neutral-600">
              Skor Anda: <strong className="text-black font-black text-xl">{score}</strong> dari {SAMPLE_QUESTIONS.length} soal terjawab benar.
            </p>
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-100"
              >
                <RotateCcw className="size-4" /> Ulangi Latihan
              </button>
              <Link href="/tunanetra/ujian" className={`${btnLime} px-7 py-3 text-sm`}>
                Lanjut ke Ujian Resmi (PIN)
              </Link>
            </div>
          </div>
        ) : (
          /* Question Box */
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-md md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <span className="text-sm font-bold text-neutral-500">
                Pertanyaan {currentIdx + 1} dari {SAMPLE_QUESTIONS.length}
              </span>
              <button
                type="button"
                onClick={() => speakText(`Soal: ${currentQ.question}`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200"
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
                const letter = String.fromCharCode(65 + i)
                const isSelected = selectedOpt === i
                const isCorrect = i === currentQ.answerIndex

                let btnStyle = 'border-neutral-200 hover:border-black bg-white text-neutral-900'
                if (isAnswered) {
                  if (isCorrect) btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                  else if (isSelected) btnStyle = 'border-red-500 bg-red-50 text-red-950 line-through'
                }

                return (
                  <button
                    key={i}
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
