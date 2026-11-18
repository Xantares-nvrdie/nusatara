'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Ear,
  Eye,
  Hand,
  Headphones,
  Radio,
  School,
  Sparkles,
  Volume2,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DecoSquares, GridBackground } from '@/components/site/decor'
import { DarkCapsuleNavbar } from '@/components/site/navbar'

const PORTALS = [
  {
    href: '/guru',
    badge: 'Portal Pendidik',
    name: 'Guru & Pengajar',
    handle: '@guru.nusatara',
    subtitle: 'Konversi AI & Ujian',
    icon: School,
    image: '/images/portal-guru.png',
    alt: 'Guru menyiapkan materi pelajaran di laptop',
  },
  {
    href: '/tunanetra',
    badge: 'Voice Only & Speech',
    name: 'Siswa Tunanetra',
    handle: '@suara.nusatara',
    subtitle: 'Ujian Mandiri Suara',
    icon: Headphones,
    image: '/images/portal-tunanetra.png',
    alt: 'Siswa tunanetra mendengarkan materi dengan headphone',
  },
  {
    href: '/tunarungu',
    badge: 'Visual & Isyarat',
    name: 'Siswa Tunarungu',
    handle: '@visual.nusatara',
    subtitle: 'Peta Konsep & Isyarat',
    icon: Hand,
    image: '/images/portal-tunarungu.png',
    alt: 'Siswa tunarungu berbahasa isyarat di depan tablet',
  },
]

const STATS = [
  { label: 'Aksesibilitas', value: '100%', sub: 'Tunanetra & Tunarungu' },
  { label: 'Koneksi 3T', value: 'Offline', sub: 'Didukung Cache Lokal' },
  { label: 'Penilaian Ujian', value: 'Otomatis', sub: 'Skor Dihitung Server' },
  { label: 'Biaya Akses', value: 'Gratis', sub: 'Untuk SLB se-Indonesia' },
]

export function HomeHero() {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // Header Navigation Entrance
      tl.from('.hero-nav', {
        y: -30,
        opacity: 0,
        duration: 0.6,
        clearProps: 'all',
      })

      // Badge Pop
      tl.from(
        '.hero-badge',
        {
          scale: 0.8,
          opacity: 0,
          duration: 0.5,
          ease: 'back.out(2)',
          clearProps: 'all',
        },
        '-=0.3',
      )

      // Headline entrance
      tl.from(
        '.hero-title-line',
        {
          y: 30,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        },
        '-=0.3',
      )

      // Subtitle & CTAs
      tl.from(
        '.hero-desc',
        {
          y: 20,
          opacity: 0,
          duration: 0.5,
          clearProps: 'all',
        },
        '-=0.3',
      )

      tl.from(
        '.hero-cta-btn',
        {
          scale: 0.9,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'back.out(1.5)',
          clearProps: 'all',
        },
        '-=0.3',
      )

      // Portal Cards Entrance (Snappy and clean)
      tl.from(
        '.portal-card',
        {
          y: 40,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        },
        '-=0.2',
      )

      // Continuous gentle hover animation for side floating widgets
      gsap.to('.floating-widget-left', {
        y: '-=10',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('.floating-widget-right', {
        y: '+=10',
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.5,
      })
    },
    { scope: container },
  )

  return (
    <div ref={container} className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white text-[#111]">
      <GridBackground />
      <DecoSquares count={7} />

      {/* Top Navbar */}
      <header className="hero-nav relative z-30">
        <DarkCapsuleNavbar
          links={[
            { href: '#portal', label: 'Cari Modul' },
            { href: '/tunanetra', label: 'Pemutar Suara' },
            { href: '/tunarungu', label: 'Bantuan Akses' },
            { href: '#keunggulan', label: 'Keunggulan' },
          ]}
          action={{
            label: 'Login Guru',
            href: '/masuk',
          }}
        />
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-14 text-center lg:pt-20 lg:pb-20">
        {/* Social Proof Pill */}
        <div className="hero-badge mb-6 inline-flex items-center gap-2.5 rounded-full bg-transparent px-3 py-1">
          <div className="flex -space-x-1.5">
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-neutral-800 text-[10px] font-black text-white shadow-sm">
              G
            </div>
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-lime text-[10px] font-black text-black shadow-sm">
              S
            </div>
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-[10px] font-black text-lime shadow-sm">
              N
            </div>
          </div>
          <span className="text-xs font-semibold text-neutral-600">
            10k+ Siswa & Guru telah bergabung
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-5 max-w-3xl text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.06] text-[#0b0b0a] text-balance">
          <span className="hero-title-line block">Belajar inklusif.</span>
          <span className="hero-title-line block">Bertenaga AI.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-desc mb-8 max-w-xl text-xs sm:text-sm leading-relaxed text-neutral-500 font-medium">
          Akses materi dengan naskah suara ramah tunanetra dan visual untuk tunarungu. Dilengkapi Gemini AI untuk menyusun soal secara instan bagi guru.
        </p>

        {/* Single Lime CTA Button */}
        <div className="flex items-center justify-center">
          <Link
            href="/tunanetra/ujian"
            className="hero-cta-btn group inline-flex items-center gap-3.5 rounded-full bg-lime py-3.5 pl-8 pr-3 text-xs sm:text-sm font-black uppercase tracking-wider text-[#111] shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <span>MASUK UJIAN (PIN)</span>
            <span className="flex size-7 items-center justify-center rounded-full bg-[#111] text-white transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            </span>
          </Link>
        </div>

        {/* Floating Side Badge: Left (100% Ramah Netra) */}
        <div className="floating-widget-left pointer-events-none absolute left-[4%] bottom-[14%] hidden xl:block">
          <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 px-4 shadow-[0_8px_25px_rgba(0,0,0,0.05)] backdrop-blur-md">
            <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
              <Headphones className="size-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-black text-neutral-900 leading-tight">100%</span>
              <span className="text-[11px] text-neutral-500 font-medium leading-tight">Ramah Netra</span>
            </div>
          </div>
        </div>

        {/* Floating Side Badge: Right (Gemini AI Asisten Guru) */}
        <div className="floating-widget-right pointer-events-none absolute right-[4%] bottom-[20%] hidden xl:block">
          <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 px-4 shadow-[0_8px_25px_rgba(0,0,0,0.05)] backdrop-blur-md">
            <div className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900">
              <Sparkles className="size-4" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-black text-neutral-900 leading-tight">Gemini AI</span>
              <span className="text-[11px] text-neutral-500 font-medium leading-tight">Asisten Guru</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3 Portal Cards in Simple Creator Card Style */}
      <section id="portal" aria-labelledby="portal-heading" className="relative z-10 px-6 pb-12 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 id="portal-heading" className="sr-only">
            Pilihan Portal NusaTara
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PORTALS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="portal-card group relative flex aspect-[3/4] max-h-[460px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/20 bg-neutral-950 p-5 shadow-[0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.2)]"
              >
                {/* Full-bleed Background Image */}
                <Image
                  src={p.image}
                  alt={p.alt}
                  fill
                  priority
                  unoptimized
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Top Vignette Gradient for Readability */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />

                {/* Bottom Frosted Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-[2px] pointer-events-none" />

                {/* Top Header: Badge + Title */}
                <div className="relative z-10 flex flex-col items-center text-center pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md shadow-sm">
                    <Sparkles className="size-3 text-lime" />
                    <span>{p.badge}</span>
                  </span>
                  <h3 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                    {p.name}
                  </h3>
                </div>

                {/* Bottom Bar: Avatar, Info & Masuk Button */}
                <div className="relative z-10 flex items-center justify-between gap-3 pt-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-lime backdrop-blur-md shadow-inner">
                      <p.icon className="size-5" />
                    </span>
                    <div className="min-w-0 text-left">
                      <span className="block truncate text-xs font-bold text-white drop-shadow">
                        {p.handle}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-white/75 drop-shadow">
                        {p.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-white px-5 py-2 text-xs font-bold text-neutral-950 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:bg-lime group-hover:text-black">
                    Masuk
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Section: Inovasi Aksesibilitas */}
      <section id="keunggulan" className="relative z-10 border-t border-black/10 bg-white px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-[1140px]">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#111] bg-lime px-3.5 py-1 rounded-full shadow-sm">
              Inovasi Aksesibilitas
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#111]">
              Mengapa NusaTara Berbeda?
            </h2>
            <p className="mt-2 text-neutral-600 text-xs sm:text-sm font-medium">
              Dirancang khusus menjawab tantangan nyata pembelajaran inklusif di Indonesia.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1: Audio Deskriptif (Black Theme) */}
            <div className="group relative flex h-[410px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#111] text-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              {/* Top Text */}
              <div className="text-center">
                <h3 className="text-2xl font-black tracking-tight">Audio Deskriptif</h3>
                <p className="mt-2 text-xs sm:text-sm text-neutral-400 font-medium leading-relaxed max-w-[240px] mx-auto">
                  Narasi suara alami untuk siswa tunanetra tanpa perlu menatap layar
                </p>
              </div>

              {/* Bottom UI Mockup Preview */}
              <div className="relative mt-auto flex flex-col items-center justify-end pt-4">
                {/* Backing layered card */}
                <div className="absolute bottom-16 h-20 w-[78%] rounded-2xl bg-white/10 border border-white/10 -rotate-2" />

                {/* Front mini player card */}
                <div className="relative z-10 w-[92%] rounded-2xl bg-white p-4 text-black shadow-2xl -mb-2 border border-black/5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-lime text-black font-black text-[10px]">
                        AI
                      </span>
                      <span className="text-xs font-bold text-neutral-900 truncate">Modul 01: Ekosistem</span>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400">02:15</span>
                  </div>

                  {/* Soundwave bars */}
                  <div className="mt-3 flex items-center justify-between gap-1 h-8 px-1">
                    {[40, 75, 100, 60, 85, 45, 95, 70, 50, 90, 65, 80, 40].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full ${i % 3 === 0 ? 'bg-lime' : 'bg-black'}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 text-[11px] font-bold text-neutral-700">
                    <span>1.0x Kecepatan</span>
                    <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] text-lime">Memutar Audio</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Peta Konsep & Isyarat (Lime Theme - Center Highlight) */}
            <div className="group relative flex h-[410px] flex-col justify-between overflow-hidden rounded-[32px] bg-lime text-[#111] p-7 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              {/* Top Text */}
              <div className="text-center">
                <h3 className="text-2xl font-black tracking-tight">Peta Konsep & Isyarat</h3>
                <p className="mt-2 text-xs sm:text-sm text-neutral-800 font-medium leading-relaxed max-w-[240px] mx-auto">
                  Hierarki visual dan kartu istilah yang ramah bagi penutur isyarat
                </p>
              </div>

              {/* Bottom UI Mockup Preview (Two overlapping tilted cards like reference) */}
              <div className="relative mt-auto flex items-end justify-center pt-4 h-48 -mb-3">
                {/* Card A (Folders): Tilted Left */}
                <div className="relative z-10 w-[60%] rounded-2xl bg-white p-3.5 text-black shadow-xl -rotate-6 border border-black/10 transition-transform group-hover:-rotate-8">
                  <span className="block text-[11px] font-black text-neutral-900 pb-1.5 border-b border-neutral-100">
                    Struktur Bab
                  </span>
                  <div className="mt-2 space-y-1.5 text-[11px] font-semibold text-neutral-700">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-neutral-400">📁</span> Pengantar
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-neutral-400">📁</span> Inti Materi
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-neutral-400">📁</span> Latihan
                    </div>
                  </div>
                </div>

                {/* Card B (Tags & Isyarat): Tilted Right Overlapping */}
                <div className="relative z-20 -ml-8 w-[58%] rounded-2xl bg-black p-3.5 text-white shadow-2xl rotate-6 border border-white/10 transition-transform group-hover:rotate-8 mb-2">
                  <span className="block text-[11px] font-black text-lime pb-1.5 border-b border-neutral-800">
                    Kosakata
                  </span>
                  <div className="mt-2 space-y-1.5 text-[11px] font-bold">
                    <div className="text-white truncate"># visual</div>
                    <div className="text-lime truncate"># bahasa_isyarat</div>
                    <div className="text-neutral-400 truncate"># ringkasan</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Ujian Instan PIN (Black Theme) */}
            <div className="group relative flex h-[410px] flex-col justify-between overflow-hidden rounded-[32px] bg-[#111] text-white p-7 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              {/* Top Text */}
              <div className="text-center">
                <h3 className="text-2xl font-black tracking-tight">Ujian Instan (PIN)</h3>
                <p className="mt-2 text-xs sm:text-sm text-neutral-400 font-medium leading-relaxed max-w-[240px] mx-auto">
                  Tanpa email rumit, siswa cukup 4 digit angka untuk mulai mandiri
                </p>
              </div>

              {/* Bottom UI Mockup Preview */}
              <div className="relative mt-auto flex flex-col items-center justify-end pt-4">
                {/* Backing layered card */}
                <div className="absolute bottom-16 h-20 w-[78%] rounded-2xl bg-white/10 border border-white/10 rotate-2" />

                {/* Front mini PIN card */}
                <div className="relative z-10 w-[92%] rounded-2xl bg-white p-4 text-black shadow-2xl -mb-2 border border-black/5">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-[11px] font-bold text-neutral-500">Ketik PIN Ujian</span>
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>

                  {/* 4 digit boxes */}
                  <div className="mt-2.5 flex items-center justify-center gap-2.5">
                    {['1', '2', '3', '4'].map((digit, i) => (
                      <div
                        key={i}
                        className={`flex size-10 items-center justify-center rounded-xl font-mono text-sm font-black border-2 ${
                          i === 3 ? 'border-black bg-lime text-black shadow-sm' : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                        }`}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center justify-between rounded-xl bg-black px-3.5 py-2 text-[11px] font-black text-white">
                    <span>Mulai Ujian</span>
                    <span className="text-lime">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Bar */}
      <section className="relative z-10 border-t border-black/10 bg-[#111] px-6 py-10 text-white lg:px-12">
        <div className="mx-auto max-w-[1140px]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center text-center p-3">
                <span className="text-2xl sm:text-3xl font-black text-lime tracking-tight">{s.value}</span>
                <span className="mt-1 text-xs sm:text-sm font-bold">{s.label}</span>
                <span className="text-[11px] text-neutral-400 font-medium">{s.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
