import type { Metadata } from 'next'
import { StudentShell } from '@/components/student/student-shell'
import { ModuleViewer } from '@/components/student/module-viewer'

export const metadata: Metadata = { title: 'Modul audio' }

export default async function ModulAudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <StudentShell>
      <ModuleViewer id={id} mode="audio" />
    </StudentShell>
  )
}
