import type { Metadata } from 'next'
import { ExamList } from '@/components/guru/exam-list'

export const metadata: Metadata = { title: 'Ujian' }

export default function UjianPage() {
  return <ExamList />
}
