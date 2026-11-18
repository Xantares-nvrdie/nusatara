'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

export function GridBackground() {
  return <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0" />
}

export function AnimatedAmbientGlow() {
  return null
}

export function DecoSquares({ count = 7 }: { count?: number }) {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>('.floating-deco').forEach((el, i) => {
        gsap.to(el, {
          y: `${(i % 2 === 0 ? '-' : '+')}=16`,
          rotation: (i % 2 === 0 ? 6 : -6),
          duration: 5 + (i % 3) * 1.5,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: i * 0.4,
        })
      })
    },
    { scope: container },
  )

  const squares = [
    { cls: 'top-[15%] left-[5%]', size: 54, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'top-[10%] left-[18%]', size: 42, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'top-[28%] left-[8%]', size: 68, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'top-[12%] right-[6%]', size: 76, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'top-[24%] right-[14%]', size: 48, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'bottom-[12%] left-[16%]', size: 44, bg: 'bg-black/[0.03] border-black/5' },
    { cls: 'bottom-[18%] right-[12%]', size: 58, bg: 'bg-black/[0.03] border-black/5' },
  ]

  return (
    <div ref={container} className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {squares.slice(0, count).map((s, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            'floating-deco absolute hidden rounded-2xl border backdrop-blur-[2px] md:block shadow-sm',
            s.cls,
            s.bg,
          )}
          style={{ width: s.size, height: s.size }}
        />
      ))}
    </div>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('group flex items-center gap-2.5 font-black tracking-tight text-[#111]', className)}>
      <span className="flex size-8 items-center justify-center rounded-full bg-[#111] shadow-sm transition-transform duration-300 group-hover:scale-105">
        <svg className="size-4 text-lime" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.25 4.5C5.25 4.08579 5.58579 3.75 6 3.75H8.75C9.07065 3.75 9.36371 3.93339 9.50346 4.2215L14.75 15.0384V4.5C14.75 4.08579 15.0858 3.75 15.5 3.75H18C18.4142 3.75 18.75 4.08579 18.75 4.5V19.5C18.75 19.9142 18.4142 20.25 18 20.25H15.25C14.9293 20.25 14.6363 20.0666 14.4965 19.7785L9.25 8.96162V19.5C9.25 19.9142 8.91421 20.25 8.5 20.25H6C5.58579 20.25 5.25 19.9142 5.25 19.5V4.5Z" />
        </svg>
      </span>
      <span className="text-base font-black tracking-tight text-[#111]">NusaTara</span>
    </Link>
  )
}

export function BackLink({ href, label = 'Kembali', className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-foreground px-6 text-sm font-extrabold uppercase tracking-widest transition-all hover:bg-foreground hover:text-background hover:scale-[1.02] shadow-sm',
        className,
      )}
    >
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
      {label}
    </Link>
  )
}
