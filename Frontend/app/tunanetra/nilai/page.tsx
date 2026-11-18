'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, Volume2, Search, CheckCircle2, Mic } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'

interface StudentResult {
  pin: string
  name: string
  subject: string
  score: number
  date: string
  feedback: string
}

const SAMPLE_RESULTS: StudentResult[] = [
  {
    pin: '1234',
    name: 'Ahmad Fauzi',
    subject: 'IPA — Ekosistem dan Rantai Makanan',
    score: 90,
    date: '18 November 2026',
    feedback: 'Pemahaman materi ekosistem sangat baik. Berhasil menjawab 9 dari 10 soal dengan benar.',
  },
  {
    pin: '1234',
    name: 'Ahmad Fauzi',
    subject: 'PPKN — Makna Sila-Sila Pancasila',
    score: 85,
    date: '15 November 2026',
    feedback: 'Mampu menjelaskan implementasi nilai pancasila dengan tepat.',
  },
]

export default function CekNilaiTunanetraPage() {
  const [pinInput, setPinInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<StudentResult[]>([])

  function speakText(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'id-ID'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearched(true)

    // Match sample or provide results
    if (pinInput.trim() === '1234' || nameInput.toLowerCase().includes('ahmad') || pinInput.length > 0) {
      setResults(SAMPLE_RESULTS)
      speakText(
        `Hasil ditemukan untuk PIN ${pinInput || '1234'}. Ditemukan dua riwayat ujian. Nilai pertama: Ujian IPA dengan skor 90 dari 100, predikat sangat baik. Nilai kedua: Ujian PPKN dengan skor 85 dari 100. Selamat atas pencapaian belajarmu!`
      )
    } else {
      setResults([])
      speakText('Maaf, belum ada data ujian dengan PIN tersebut. Pastikan PIN atau nama yang dimasukkan sudah benar.')
    }
  }

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
            Ketik PIN 4 digit atau nama Anda untuk mendengarkan rekapitulasi nilai dan catatan hasil belajar.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-md md:p-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full flex-1">
              <label htmlFor="pin-input" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Masukkan PIN Ujian (Contoh: 1234)
              </label>
              <input
                id="pin-input"
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN 4 Digit..."
                className="w-full rounded-2xl border-2 border-neutral-300 px-4 py-3 font-mono text-lg font-bold tracking-widest text-black focus:border-black focus:outline-none"
              />
            </div>

            <div className="w-full sm:w-auto self-end">
              <button
                type="submit"
                className={`${btnLime} w-full min-h-[52px] px-8 text-sm font-black uppercase`}
              >
                <Search className="size-4 mr-2" />
                Cari & Bacakan
              </button>
            </div>
          </form>
        </div>

        {/* Results List */}
        {searched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-neutral-900">
                Riwayat Ujian ({results.length})
              </h2>
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    speakText(
                      `Membacakan ulang nilai. Skor IPA Anda adalah 90, dan skor PPKN adalah 85. Evaluasi pemahaman Anda sangat baik.`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                >
                  <Volume2 className="size-3.5 text-lime" />
                  Bacakan Semua Ulang
                </button>
              )}
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm hover:border-black/25 transition-all"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-neutral-500">{r.date}</span>
                      <h3 className="text-lg font-black text-neutral-900">{r.subject}</h3>
                      <p className="text-xs text-neutral-600 font-medium max-w-xl">{r.feedback}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="block text-3xl font-black text-neutral-900">{r.score}</span>
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Sangat Baik
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          speakText(
                            `Ujian ${r.subject}. Anda mendapatkan nilai ${r.score} dari 100. Catatan: ${r.feedback}`
                          )
                        }
                        className="flex size-11 items-center justify-center rounded-2xl bg-neutral-100 text-black hover:bg-lime hover:text-black transition-colors"
                        title="Dengarkan soal ini"
                      >
                        <Volume2 className="size-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-600">
                <p className="font-semibold text-sm">Tidak ditemukan hasil ujian dengan PIN tersebut.</p>
                <p className="text-xs mt-1 text-neutral-400">Silakan gunakan PIN demo: <strong>1234</strong></p>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentShell>
  )
}
