import type { Metadata } from 'next'
import { CoursePlayer } from '@/components/student/course-player'

export const metadata: Metadata = { title: 'Ruang Belajar LMS · NusaTara' }

export default async function KartuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CoursePlayer id={id} />
}
