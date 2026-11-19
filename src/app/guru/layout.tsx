import type { Metadata } from 'next'
import { GuruShell } from '@/components/guru/guru-shell'

export const metadata: Metadata = { title: { default: 'Portal guru', template: '%s · Portal guru' } }

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return <GuruShell>{children}</GuruShell>
}
