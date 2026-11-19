import type { Metadata } from 'next'
import { ModuleList } from '@/components/guru/module-list'

export const metadata: Metadata = { title: 'Modul' }

export default function ModulPage() {
  return <ModuleList />
}
