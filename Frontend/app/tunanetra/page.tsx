import type { Metadata } from 'next'
import Link from 'next/link'
import { Hand, Headphones, Mic } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { ModuleCards } from '@/components/student/module-cards'
import { btnLime } from '@/components/site/form'

export const metadata: Metadata = { title: 'Portal tunanetra' }

const tips = [
  { icon: Headphones, title: 'Dengarkan materi', text: 'Setiap modul dibacakan dengan suara. Bisa jeda dan ulang.' },
  { icon: Hand, title: 'Mode suara & ketuk layar', text: 'Ucapkan "Jawab B", atau cukup ketuk layar 1x-4x (A-D) tanpa melihat tombol.' },
  { icon: Mic, title: 'Bicara otomatis', text: 'Tekan tombol Bicara lalu sebutkan nama, PIN, atau jawaban Anda.' },
]

export default function TunanetraPage() {
  return (
    <StudentShell>
      <section className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 rounded-[2rem] bg-black p-8 text-white md:p-12">
          <h1 className="max-w-2xl text-4xl font-black tracking-tight text-balance md:text-6xl">Belajar dengan mendengar.</h1>
          <p className="max-w-xl text-lg text-white/80">Halaman ujian memakai kontras tinggi hitam-kuning dan dibacakan otomatis.</p>
          <Link href="/tunanetra/ujian" className={`${btnLime} min-h-14 w-fit px-8 text-base`}>
            Mulai ujian suara
          </Link>
        </div>
        <ul id="panduan" className="grid gap-4 md:grid-cols-3 scroll-mt-24">
          {tips.map((t) => (
            <li key={t.title} className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-6">
              <t.icon className="size-6" aria-hidden="true" />
              <h2 className="font-extrabold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">{t.text}</p>
            </li>
          ))}
        </ul>
        <div>
          <h2 className="mb-5 text-2xl font-black">Modul audio</h2>
          <ModuleCards base="/tunanetra/modul" />
        </div>
      </section>
    </StudentShell>
  )
}
