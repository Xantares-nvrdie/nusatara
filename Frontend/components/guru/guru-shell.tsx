'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, User, X } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Logo } from '@/components/site/decor'
import { DarkCapsuleNavbar } from '@/components/site/navbar'
import { Skeleton } from '@/components/site/form'
import { signOut, useHydrated, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/guru', label: 'Beranda', exact: true },
  { href: '/guru/modul', label: 'Modul' },
  { href: '/guru/ujian', label: 'Ujian' },
  { href: '/guru/nilai', label: 'Nilai' },
]

export function GuruShell({ children }: { children: React.ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const hydrated = useHydrated()
  const teacher = useStore((s) => s.teacher)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.from('.guru-navbar', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' })
      gsap.from('#konten', { opacity: 0, y: 15, duration: 0.5, ease: 'power2.out' })
    },
    { scope: shellRef, dependencies: [pathname] },
  )

  useEffect(() => {
    if (hydrated && !teacher) router.replace(`/masuk?next=${encodeURIComponent(pathname)}`)
  }, [hydrated, teacher, pathname, router])

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [menuOpen])

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
  const initials = teacher?.name
    .replace(/^(Bu|Pak)\s+/i, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

  return (
    <div ref={shellRef} className="min-h-screen bg-[#fafaf9]">
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:font-bold">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30">
        <DarkCapsuleNavbar
          links={NAV}
          userMenu={{
            name: teacher?.name,
            email: teacher?.email,
            onSignOut: () => signOut(),
          }}
        />
      </header>
      <main id="konten" className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        {hydrated && teacher ? (
          children
        ) : (
          <div role="status" className="flex flex-col gap-4">
            <span className="sr-only">Memuat…</span>
            <Skeleton className="h-10 w-64" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-balance md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
