'use client'

import { Suspense, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DecoSquares, GridBackground } from '@/components/site/decor'
import { DarkCapsuleNavbar } from '@/components/site/navbar'
import { AuthForm } from './auth-form'

export function AuthShell({ mode }: { mode: 'masuk' | 'daftar' }) {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.auth-header', {
        y: -30,
        opacity: 0,
        duration: 0.7,
      })

      tl.from(
        '.auth-card',
        {
          y: 40,
          scale: 0.94,
          opacity: 0,
          duration: 0.85,
          ease: 'back.out(1.4)',
        },
        '-=0.4',
      )

      tl.from(
        '.auth-side-info',
        {
          x: -30,
          opacity: 0,
          duration: 0.8,
        },
        '-=0.6',
      )
    },
    { scope: container },
  )

  return (
    <main ref={container} className="relative flex min-h-screen flex-col overflow-hidden bg-white text-[#111]">
      <GridBackground />
      <DecoSquares count={6} />

      <header className="auth-header relative z-10">
        <DarkCapsuleNavbar
          links={[
            { href: '/', label: 'Beranda' },
            { href: '/tunanetra', label: 'Tunanetra' },
            { href: '/tunarungu', label: 'Tunarungu' },
          ]}
          action={{
            label: mode === 'masuk' ? 'Daftar' : 'Masuk',
            href: mode === 'masuk' ? '/daftar' : '/masuk',
          }}
        />
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Side Info for Visual Balance */}
          <div className="auth-side-info hidden flex-1 flex-col gap-5 lg:flex">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-lime/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-black">
              <Sparkles className="size-3.5" />
              Portal Khusus Pendidik
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
              Selamat datang di Ruang Inklusi NusaTara.
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600 font-medium">
              Satu pintu untuk mengelola modul ajar, men-generate naskah audio & visual berbasis AI, serta memantau hasil ujian suara siswa secara langsung.
            </p>

            <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Akun demo siap digunakan:</span>
              </div>
              <div className="font-mono text-xs text-neutral-700 space-y-1">
                <div>Email: <strong className="text-black">guru@nusatara.id</strong></div>
                <div>Password: <strong className="text-black">password123</strong></div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="auth-card w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 shadow-[0_15px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <Suspense>
              <AuthForm mode={mode} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
