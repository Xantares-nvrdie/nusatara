'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/guru/guru-shell'
import { Alert, Field, btnLime, inputClass } from '@/components/site/form'
import { updateProfile, useStore } from '@/lib/store'

export function ProfileForm() {
  const teacher = useStore((s) => s.teacher)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (teacher) setName(teacher.name)
  }, [teacher])

  const [saveError, setSaveError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setStatus('error')
    setStatus('saving')
    setSaveError('')
    try {
      await updateProfile(name.trim())
      setStatus('saved')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
      setStatus('idle')
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Profil" description="Nama ini tampil di setiap modul yang Anda buat." />
      <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl border border-border bg-white p-6 md:p-8">
        {status === 'saved' && <Alert tone="success" title="Profil tersimpan." />}
        {saveError && <Alert title="Profil belum tersimpan">{saveError}</Alert>}
        <Field id="nama-guru" label="Nama lengkap" error={status === 'error' ? 'Nama wajib diisi.' : undefined}>
          <input id="nama-guru" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={status === 'error'} className={inputClass} />
        </Field>
        <Field id="email-guru" label="Email">
          <input id="email-guru" value={teacher?.email ?? ''} readOnly disabled className={inputClass} />
        </Field>
        <button type="submit" disabled={status === 'saving'} className={`${btnLime} self-start`}>
          {status === 'saving' ? 'Menyimpan…' : 'Simpan perubahan'}
        </button>
      </form>
    </div>
  )
}
