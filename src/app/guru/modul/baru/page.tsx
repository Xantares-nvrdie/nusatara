import type { Metadata } from 'next'
import { ConvertForm } from '@/components/guru/convert-form'

export const metadata: Metadata = { title: 'Konversi materi' }

export default function KonversiPage() {
  return <ConvertForm />
}
