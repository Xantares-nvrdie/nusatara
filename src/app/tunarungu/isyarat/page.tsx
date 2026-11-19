'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Hand, Search, Sparkles, BookOpen, Filter } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'

interface SignWord {
  id: string
  word: string
  category: 'IPA' | 'PPKN' | 'Umum'
  gesture: string
  gestureType: string
  definition: string
  example: string
}

const SIGN_DICTIONARY: SignWord[] = [
  {
    id: '1',
    word: 'Ekosistem',
    category: 'IPA',
    gestureType: 'Dua Tangan Melingkar',
    gesture: 'Kedua tangan membentuk lingkaran horizontal di depan dada lalu mengembang perlahan ke luar.',
    definition: 'Hubungan timbal balik yang saling bergantung antara makhluk hidup dan alam sekitarnya.',
    example: 'Hutan lindung adalah contoh ekosistem alami yang kaya flora dan fauna.',
  },
  {
    id: '2',
    word: 'Fotosintesis',
    category: 'IPA',
    gestureType: 'Jari Merekat & Menadah',
    gesture: 'Tangan kiri menadah seperti daun, tangan kanan di atas mengibaskan jari menggambarkan sinar matahari.',
    definition: 'Proses tumbuhan hijau mengolah sinar matahari, air, dan udara menjadi sumber energi makanan.',
    example: 'Tumbuhan hijau membutuhkan cahaya matahari untuk fotosintesis.',
  },
  {
    id: '3',
    word: 'Gotong Royong',
    category: 'PPKN',
    gestureType: 'Kedua Telapak Menaut',
    gesture: 'Kedua tangan saling menggenggam atau menautkan jari, digerakkan maju bersama secara kompak.',
    definition: 'Bekerja bersama-sama saling membantu untuk menyelesaikan suatu tujuan kepentingan bersama.',
    example: 'Warga desa bergotong royong membersihkan selokan lingkungan.',
  },
  {
    id: '4',
    word: 'Pancasila',
    category: 'PPKN',
    gestureType: 'Lima Jari Terbuka Tegak',
    gesture: 'Tangan kanan membuka lima jari tegak di depan dada sebagai simbol lima sila dasar negara.',
    definition: 'Dasar negara Indonesia yang terdiri dari lima sila sebagai panduan hidup berbangsa.',
    example: 'Sila ketiga Pancasila mengajarkan persatuan Indonesia.',
  },
  {
    id: '5',
    word: 'Klorofil',
    category: 'IPA',
    gestureType: 'Jari Menguncup Hijau',
    gesture: 'Jari tangan menguncup di dekat daun, kemudian digerakkan ke dada melambangkan zat hijau daun.',
    definition: 'Zat pigmen hijau alami pada tumbuhan yang berfungsi menyerap energi sinar matahari.',
    example: 'Daun berwarna hijau karena memiliki zat klorofil.',
  },
  {
    id: '6',
    word: 'Demokrasi',
    category: 'PPKN',
    gestureType: 'Angkat Tangan & Pilihan',
    gesture: 'Tangan kanan terangkat dengan telapak menghadap ke depan lalu menunjuk pilihan musyawarah.',
    definition: 'Sistem pemerintahan dari rakyat, oleh rakyat, dan untuk rakyat yang mengutamakan musyawarah.',
    example: 'Pemilihan ketua kelas secara voting adalah wujud demokrasi di sekolah.',
  },
]

export default function KamusIsyaratPage() {
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<'Semua' | 'IPA' | 'PPKN'>('Semua')

  const filteredWords = SIGN_DICTIONARY.filter((item) => {
    const matchCat = selectedCat === 'Semua' || item.category === selectedCat
    const matchSearch =
      item.word.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <StudentShell>
      <div className="space-y-8">
        {/* Banner */}
        <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
              <Hand className="size-3.5" />
              Kamus Bahasa Isyarat & Kosakata
            </span>
            <span className="text-xs text-white/70">Panduan Gerakan Visual</span>
          </div>
          <h1 className="text-2xl font-black md:text-4xl">Kamus Isyarat Pelajaran</h1>
          <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Daftar istilah penting dalam modul ajar lengkap dengan deskripsi gerakan tangan, penjelasan ringkas, dan contoh kalimat.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kata (contoh: Fotosintesis)..."
              className="w-full rounded-2xl border border-neutral-200 py-2.5 pl-11 pr-4 text-xs font-semibold text-neutral-900 focus:border-black focus:outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(['Semua', 'IPA', 'PPKN'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCat === cat
                    ? 'bg-black text-lime font-black shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dictionary Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWords.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-6 shadow-sm hover:shadow-md hover:border-black/25 transition-all"
            >
              <div className="space-y-4">
                {/* Header: Category Badge + Gesture Pill */}
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-lime px-3 py-0.5 text-[10px] font-black uppercase text-black">
                    {item.category}
                  </span>
                  <span className="rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-bold text-neutral-700 flex items-center gap-1">
                    <Hand className="size-3 text-neutral-800" />
                    {item.gestureType}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-black text-neutral-900">{item.word}</h3>
                  <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed font-medium">
                    {item.definition}
                  </p>
                </div>

                {/* Gesture Instruction Box */}
                <div className="rounded-2xl border border-neutral-100 bg-[#fafaf9] p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
                    Panduan Gerakan Isyarat:
                  </span>
                  <p className="text-xs text-neutral-800 font-semibold leading-relaxed">
                    {item.gesture}
                  </p>
                </div>
              </div>

              {/* Example sentence */}
              <div className="mt-5 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500 italic">
                Contoh: &quot;{item.example}&quot;
              </div>
            </div>
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center text-neutral-600">
            <p className="font-bold text-sm">Tidak ditemukan kosakata yang sesuai.</p>
            <p className="text-xs mt-1 text-neutral-400">Coba ubah kata pencarian atau pilih kategori &quot;Semua&quot;.</p>
          </div>
        )}
      </div>
    </StudentShell>
  )
}
