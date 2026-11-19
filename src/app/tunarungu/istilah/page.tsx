import type { Metadata } from 'next'
import { StudentShell } from '@/components/student/student-shell'
import { GlossaryDictionary } from '@/components/student/glossary-dictionary'

export const metadata: Metadata = { title: 'Kamus istilah' }

export default function KamusIstilahPage() {
  return (
    <StudentShell>
      <GlossaryDictionary />
    </StudentShell>
  )
}
