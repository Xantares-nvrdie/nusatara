import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'

export const metadata: Metadata = { title: 'Daftar guru' }

export default function DaftarPage() {
  return <AuthShell mode="daftar" />
}
