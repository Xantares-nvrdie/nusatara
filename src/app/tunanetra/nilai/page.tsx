'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Award, CheckCircle2, Loader2, Search, Volume2 } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'
import { api, ApiError } from '@/lib/api'
import { speak, stopSpeaking } from '@/lib/speech'

/** Item of GET /api/exams/:pin/results: scores only, never the answers. */
interface ExamResult {
  examTitle: string
  studentName: string
  score: number
  correctCount: number
  totalQuestions: number
  submittedAt: string
}

type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

const EMPTY_MESSAGE =
  'Belum ada nilai untuk nama itu dengan PIN tersebut. Pastikan nama sama persis seperti saat ujian.'
const OFFLINE_MESSAGE = 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function describeResult(r: ExamResult) {
  return `${r.examTitle}, nilai ${r.score}, benar ${r.correctCount} dari ${r.totalQuestions} soal`
}

function summarize(items: ExamResult[]) {
  return `Ditemukan ${items.length} nilai. ${items.map(describeResult).join('. ')}.`
}

export default function CekNilaiTunanetraPage() {
  const [nameInput, setNameInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [formError, setFormError] = useState('')
  const [invalid, setInvalid] = useState({ name: false, pin: false })
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [results, setResults] = useState<ExamResult[]>([])

  // Bumped on every search and on unmount, so a late response never replaces a newer one or speaks on another page.
  const requestRef = useRef(0)
  const nameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  // Shared helper: Indonesian voice, and stays silent while the tab is in the background.
  function speakText(text: string) {
    speak(text, { rate: 0.95 })
  }

  // Stop reading when the student leaves this page.
  useEffect(
    () => () => {
      requestRef.current += 1
      stopSpeaking()
    },
    [],
  )

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const name = nameInput.trim()
    const pin = pinInput.trim()
    const nameMissing = name.length === 0
    const pinInvalid = !/^\d{4}$/.test(pin)
    setInvalid({ name: nameMissing, pin: pinInvalid })

    if (nameMissing || pinInvalid) {
      const problems: string[] = []
      if (nameMissing) problems.push('Nama belum diisi')
      if (pinInvalid) problems.push('PIN harus 4 angka')
      const message = `${problems.join(' dan ')}.`
      setFormError(message)
      speakText(message)
      const field = nameMissing ? nameRef.current : pinRef.current
      field?.focus()
      return
    }

    setFormError('')
    requestRef.current += 1
    const requestId = requestRef.current
    setStatus('loading')
    setResults([])
    speakText('Mencari nilai.')

    try {
      const { items } = await api<{ items: ExamResult[] }>(
        `/exams/${pin}/results?name=${encodeURIComponent(name)}`,
      )
      if (requestId !== requestRef.current) return
      setResults(items)
      setStatus('done')
      speakText(items.length > 0 ? summarize(items) : EMPTY_MESSAGE)
    } catch (err) {
      if (requestId !== requestRef.current) return
      // api() throws ApiError with the HTTP status; a request that never reached the server has no status.
      const message = err instanceof ApiError && err.status !== undefined ? err.message : OFFLINE_MESSAGE
      setErrorMsg(message)
      setStatus('error')
      speakText(message)
    }
  }

  const loading = status === 'loading'

  return (
    <StudentShell>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Banner */}
        <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
              <Award className="size-3.5" />
              Rekapitulasi Nilai Mandiri
            </span>
            <span className="text-xs text-white/70">Dukungan Pembaca Suara Otomatis</span>
          </div>
          <h1 className="text-2xl font-black md:text-3xl">Cek Hasil & Nilai Ujian</h1>
          <p className="text-sm text-neutral-300">
            Ketik nama Anda dan PIN ujian 4 angka, lalu dengarkan nilai yang Anda dapat.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-md md:p-8">
          <form onSubmit={handleSearch} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full flex-1">
              <label htmlFor="name-input" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap (sama seperti saat ujian)
              </label>
              <input
                ref={nameRef}
                id="name-input"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                aria-invalid={invalid.name}
                aria-describedby={formError ? 'search-error' : undefined}
                placeholder="Nama lengkap..."
                className="w-full rounded-2xl border-2 border-neutral-300 px-4 py-3 text-lg font-bold text-black focus:border-black focus:outline-none aria-[invalid=true]:border-red-500"
              />
            </div>

            <div className="w-full sm:w-48">
              <label htmlFor="pin-input" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                PIN Ujian (4 angka)
              </label>
              <input
                ref={pinRef}
                id="pin-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                aria-invalid={invalid.pin}
                aria-describedby={formError ? 'search-error' : undefined}
                placeholder="4 angka"
                className="w-full rounded-2xl border-2 border-neutral-300 px-4 py-3 font-mono text-lg font-bold tracking-widest text-black focus:border-black focus:outline-none aria-[invalid=true]:border-red-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <button
                type="submit"
                disabled={loading}
                className={`${btnLime} w-full min-h-[52px] px-8 text-sm font-black uppercase`}
              >
                {loading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="size-4 mr-2" aria-hidden="true" />
                )}
                {loading ? 'Mencari…' : 'Cari & Bacakan'}
              </button>
            </div>
          </form>

          {formError && (
            <p id="search-error" role="alert" className="mt-4 flex items-center gap-2 text-sm font-bold text-red-600">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {formError}
            </p>
          )}
        </div>

        {loading && (
          <div
            role="status"
            className="flex items-center justify-center gap-3 rounded-3xl border border-black/10 bg-white p-8 text-neutral-700 shadow-sm"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <p className="text-sm font-bold">Mencari nilai…</p>
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="flex items-center gap-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-950">
            <AlertCircle className="size-5 shrink-0 text-red-600" aria-hidden="true" />
            <p className="text-sm font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Results List */}
        {status === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-neutral-900">
                Riwayat Ujian ({results.length})
              </h2>
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() => speakText(summarize(results))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                >
                  <Volume2 className="size-3.5 text-lime" aria-hidden="true" />
                  Bacakan Semua Ulang
                </button>
              )}
            </div>

            {results.length > 0 ? (
              <ul className="grid gap-4">
                {results.map((r) => (
                  <li
                    key={`${r.submittedAt}-${r.examTitle}`}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm hover:border-black/25 transition-all"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-neutral-500">{formatDate(r.submittedAt)}</span>
                      <h3 className="text-lg font-black text-neutral-900">{r.examTitle}</h3>
                      <p className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                        Benar {r.correctCount} dari {r.totalQuestions} soal
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="block text-3xl font-black text-neutral-900">{r.score}</span>
                        <span className="text-[11px] font-bold text-neutral-500">dari 100</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            `${r.examTitle}, ${formatDate(r.submittedAt)}. Nilai ${r.score}, benar ${r.correctCount} dari ${r.totalQuestions} soal.`,
                          )
                        }
                        className="flex size-11 items-center justify-center rounded-2xl bg-neutral-100 text-black hover:bg-lime hover:text-black transition-colors"
                        title="Dengarkan nilai ini"
                        aria-label={`Dengarkan nilai ${r.examTitle}`}
                      >
                        <Volume2 className="size-5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                role="status"
                className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-600"
              >
                <p className="font-semibold text-sm">{EMPTY_MESSAGE}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentShell>
  )
}
