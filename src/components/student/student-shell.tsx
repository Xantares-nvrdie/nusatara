'use client'

import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { OfflineBanner } from '@/components/site/offline-banner'
import { DarkCapsuleNavbar, NavLinkItem } from '@/components/site/navbar'

export const TUNANETRA_NAV_LINKS: NavLinkItem[] = [
  { href: '/tunanetra', label: 'Modul Audio', exact: true },
  { href: '/tunanetra/latihan', label: 'Latihan Suara' },
  { href: '/tunanetra/ujian', label: 'Ujian Suara' },
  { href: '/tunanetra/nilai', label: 'Cek Nilai' },
]

export const TUNARUNGU_NAV_LINKS: NavLinkItem[] = [
  { href: '/tunarungu/kartu', label: 'Kartu Materi' },
  { href: '/tunarungu/peta-konsep', label: 'Peta Konsep' },
  { href: '/tunarungu/isyarat', label: 'Kamus Isyarat' },
  { href: '/tunarungu/ujian', label: 'Ujian Visual' },
]

export function StudentShell({
  links,
  children,
}: {
  links?: NavLinkItem[]
  children: React.ReactNode
}) {
  const container = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useGSAP(
    () => {
      gsap.from('.student-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' })
      gsap.from('.student-content', { y: 25, opacity: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 })
    },
    { scope: container },
  )

  const activeLinks =
    links && links.length >= 4
      ? links
      : pathname.startsWith('/tunanetra')
        ? TUNANETRA_NAV_LINKS
        : TUNARUNGU_NAV_LINKS

  return (
    <div ref={container} className="min-h-dvh bg-background">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:font-bold"
      >
        Lewati ke konten
      </a>
      <OfflineBanner />
      <header className="student-header">
        <DarkCapsuleNavbar
          links={activeLinks}
          action={{
            label: 'Beranda',
            href: '/',
          }}
        />
      </header>
      <main id="konten" className="student-content mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        {children}
      </main>
    </div>
  )
}
