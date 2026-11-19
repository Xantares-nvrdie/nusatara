import type { Metadata } from 'next'
import { BlindExam } from '@/components/student/blind-exam'

export const metadata: Metadata = { title: 'Ujian suara' }

export default function UjianSuaraPage() {
  return <BlindExam />
}
