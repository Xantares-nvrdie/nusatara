import type { Metadata } from 'next'
import { ProfileForm } from '@/components/guru/profile-form'

export const metadata: Metadata = { title: 'Profil' }

export default function ProfilPage() {
  return <ProfileForm />
}
