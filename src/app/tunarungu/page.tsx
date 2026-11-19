import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardCheck, Eye, LayoutGrid } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { ModuleCards } from '@/components/student/module-cards'
import { btnLime } from '@/components/site/form'

export const metadata: Metadata = { title: 'Portal tunarungu' }

const deafLinks = [
  { href: '/tunarungu/kartu', label: 'Kartu' },
  { href: '/tunarungu/ujian', label: 'Ujian' },
]

const deafTips = [
  { icon: LayoutGrid, title: 'Kartu ringkas & glosarium', text: 'Rangkuman materi visual berupa poin-poin bertingkat dan kosakata penting.' },
  { icon: Eye, title: 'Struktur peta konsep', text: 'Bagan diagram relasi konsep untuk mempermudah pemahaman tanpa teks panjang.' },
  { icon: ClipboardCheck, title: 'Ujian visual mandiri', text: 'Soal pilihan ganda interaktif dengan visual jelas dan verifikasi PIN 4 digit.' },
]

export default function TunarunguPage() {
  return (
    <StudentShell>
      <section className="flex flex-col gap-10">
        {/* Banner matching Tunanetra style */}
        <div className="flex flex-col gap-6 rounded-[2rem] bg-black p-8 text-white md:p-12">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight text-balance md:text-6xl">
            Belajar dengan melihat.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Materi berupa kartu ringkas, peta konsep visual, dan glosarium istilah tanpa perlu suara.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/tunarungu/ujian" className={`${btnLime} min-h-14 w-fit px-8 text-base`}>
              Mulai ujian visual
            </Link>
            <Link
              href="/tunarungu/kartu"
              className="inline-flex min-h-14 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-base font-bold text-white transition-colors hover:bg-white/20"
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
              <span>Lihat kartu</span>
            </Link>
          </div>
        </div>

        {/* Tips grid matching Tunanetra */}
        <ul id="peta-konsep" className="grid gap-4 md:grid-cols-3 scroll-mt-24">
          {deafTips.map((t) => (
            <li key={t.title} className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-6">
              <t.icon className="size-6 text-neutral-900" aria-hidden="true" />
              <h2 className="font-extrabold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.text}</p>
            </li>
          ))}
        </ul>

        <div>
          <h2 className="mb-5 text-2xl font-black">Kartu materi terbaru</h2>
          <ModuleCards base="/tunarungu/kartu" />
        </div>
      </section>
    </StudentShell>
  )
}
