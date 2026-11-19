import type { Metadata } from 'next'
import { ExamBuilder } from '@/components/guru/exam-builder'

export const metadata: Metadata = { title: 'Buat ujian' }

export default async function UjianBaruPage({ searchParams }: { searchParams: Promise<{ modul?: string }> }) {
  const { modul } = await searchParams
  return <ExamBuilder moduleId={modul} />
}
