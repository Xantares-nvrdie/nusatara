import type { Metadata } from 'next'
import { StudentShell } from '@/components/student/student-shell'
import { ModuleCards } from '@/components/student/module-cards'

export const metadata: Metadata = { title: 'Kartu belajar' }

export default function KartuPage() {
  return (
    <StudentShell>
      <h1 className="mb-8 text-4xl font-black tracking-tight">Kartu belajar</h1>
      <ModuleCards base="/tunarungu/kartu" />
    </StudentShell>
  )
}
