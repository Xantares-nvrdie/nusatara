import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = { title: 'Masuk guru' }

export default function MasukPage() {
  return <AuthShell mode="masuk" />
}
