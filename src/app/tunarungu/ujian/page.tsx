import type { Metadata } from 'next'
import { StudentShell } from '@/components/student/student-shell'
import { DeafExam } from '@/components/student/deaf-exam'

export const metadata: Metadata = { title: 'Ujian visual' }

export default function UjianVisualPage() {
  return (
    <StudentShell>
      <DeafExam />
    </StudentShell>
  )
}
