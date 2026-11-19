import type { Metadata } from 'next'
import { Grades } from '@/components/guru/grades'

export const metadata: Metadata = { title: 'Nilai siswa' }

export default async function NilaiPage({ searchParams }: { searchParams: Promise<{ ujian?: string }> }) {
  const { ujian } = await searchParams
  return <Grades initialExamId={ujian} />
}
