'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Alert, Field, btnPrimary, inputClass } from '@/components/site/form'
import { ApiError, signIn, signUp, useStore } from '@/lib/store'

type Mode = 'masuk' | 'daftar'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')?.startsWith('/guru') ? params.get('next')! : '/guru'
  const teacher = useStore((s) => s.teacher)

  const [state, setState] = useState<string>('idle')
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({})
  const [showPw, setShowPw] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (teacher) router.replace(next)
  }, [teacher, next, router])

  useEffect(() => {
    if (state.startsWith('error')) alertRef.current?.focus()
  }, [state])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') ?? '').trim()
    const email = String(fd.get('email') ?? '').trim()
    const password = String(fd.get('password') ?? '')
    setFieldError({})
    setState('submitting')
    try {
      if (mode === 'masuk') await signIn(email, password)
      else await signUp(name, email, password)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'NETWORK'
      setMessage(err instanceof Error ? err.message : 'Gagal terhubung.')
      if (code === 'INVALID_CREDENTIALS') setState('error-credentials')
      else if (code === 'EMAIL_TAKEN') {
        setState('error-email-taken')
        setFieldError({ email: 'Email ini sudah terdaftar.' })
      } else if (code === 'PASSWORD_WEAK') {
        setState('error-password-weak')
        setFieldError({ password: 'Kata sandi minimal 8 karakter.' })
      } else setState('error-network')
    }
  }

  const submitting = state === 'submitting'
  const isLogin = mode === 'masuk'

  return (
    <div data-state={teacher ? 'already-signed-in' : state} className="w-full max-w-md">
      <h1 className="text-4xl font-black tracking-tight text-balance">{isLogin ? 'Masuk sebagai guru' : 'Daftar akun guru'}</h1>
      <p className="mt-2 text-muted-foreground">
        {isLogin ? 'Kelola modul, ujian, dan nilai siswa.' : 'Gratis untuk guru SLB dan sekolah inklusi.'}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        {state.startsWith('error') && (
          <Alert ref={alertRef} title={state === 'error-network' ? 'Gagal terhubung' : 'Tidak bisa melanjutkan'}>
            {message}
          </Alert>
        )}

        {!isLogin && (
          <Field id="name" label="Nama lengkap">
            <input id="name" name="name" required autoComplete="name" className={inputClass} />
          </Field>
        )}
        <Field id="email" label="Email" error={fieldError.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={isLogin ? 'guru@nusatara.id' : ''}
            aria-invalid={!!fieldError.email}
            aria-describedby={fieldError.email ? 'email-error' : undefined}
            className={inputClass}
          />
        </Field>
        <Field
          id="password"
          label="Kata sandi"
          hint={isLogin ? undefined : 'Minimal 8 karakter.'}
          error={fieldError.password}
        >
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              defaultValue={isLogin ? 'password123' : ''}
              aria-invalid={!!fieldError.password}
              aria-describedby={fieldError.password ? 'password-error' : isLogin ? undefined : 'password-hint'}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPw}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg hover:bg-muted"
            >
              {showPw ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </Field>

        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? 'Memproses…' : isLogin ? 'Masuk' : 'Daftar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
        <Link href={isLogin ? '/daftar' : '/masuk'} className="font-bold text-foreground underline underline-offset-4">
          {isLogin ? 'Daftar' : 'Masuk'}
        </Link>
      </p>
      {isLogin && (
        <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-center text-xs text-muted-foreground">
          Mode demo: akun <span className="font-mono text-foreground">guru@demo.id</span> sudah terisi.
        </p>
      )}
    </div>
  )
}
