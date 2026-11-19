import type { Metadata } from 'next'
import { ModuleEditor } from '@/components/guru/module-editor'

export const metadata: Metadata = { title: 'Edit modul' }

export default async function ModulUbahPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ModuleEditor id={id} />
}
