'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { LogOut, User, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/site/brand-mark'

export interface NavLinkItem {
  href: string
  label: string
  exact?: boolean
}

export interface NavbarProps {
  links: NavLinkItem[]
  action?: {
    label: string
    href?: string
    onClick?: () => void
    email?: string
  }
  userMenu?: {
    name?: string
    email?: string
    onSignOut?: () => void
  }
  className?: string
}

export function DarkCapsuleNavbar({ links, action, userMenu, className }: NavbarProps) {
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setDropdownOpen(false)
  }, [pathname])

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
        setDropdownOpen(false)
      }
    }
    if (mobileMenuOpen || dropdownOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen, dropdownOpen])

  // Handle click outside for mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null
      if (!target) return

      // Don't close if clicking the toggle button or inside the mobile menu
      if (
        buttonRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target)
      ) {
        return
      }

      setMobileMenuOpen(false)
    }

    // Attach after a short delay so the opening click/touch doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [mobileMenuOpen])

  // Handle click outside for desktop user menu
  useEffect(() => {
    if (!dropdownOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 50)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [dropdownOpen])

  function isActive(href: string, exact = false) {
    if (href.startsWith('#')) return false
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <div className={cn('w-full px-3 sm:px-4 pt-3 sm:pt-5 pb-2 relative z-40', className)}>
      <nav
        aria-label="Navigasi Utama"
        className="mx-auto flex max-w-[820px] items-center justify-between gap-2 sm:gap-4 rounded-full bg-[#18181b] p-1.5 pl-2 pr-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.18)] border border-white/10 relative z-50"
      >
        {/* Left White Circular Logo Badge */}
        <Link
          href="/"
          className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 hover:scale-105"
          title="Beranda NusaTara"
        >
          <BrandMark className="size-[18px] sm:size-5 text-black" />
        </Link>

        {/* Center Nav Links (Desktop) */}
        <ul className="hidden md:flex items-center gap-1 lg:gap-2">
          {links.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs lg:text-[13px] font-medium transition-all duration-200',
                    active
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/10',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Right Action Button & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* User Menu Dropdown (Desktop / Tablet) */}
          {userMenu ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-white px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-black shadow-sm transition-transform duration-200 hover:bg-neutral-100 hover:scale-[1.02] cursor-pointer"
              >
                <User className="size-3.5 shrink-0" />
                <span className="max-w-[80px] sm:max-w-[130px] truncate">{userMenu.name || userMenu.email || 'Akun'}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-12 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-50 text-neutral-900">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <p className="text-xs font-bold truncate">{userMenu.name || 'Guru'}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{userMenu.email}</p>
                  </div>
                  <Link
                    href="/guru/profil"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-neutral-100 transition-colors mt-1"
                  >
                    <User className="size-3.5 text-neutral-600" /> Profil Akun
                  </Link>
                  {userMenu.onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        userMenu.onSignOut?.()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5" /> Keluar
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : action ? (
            action.href ? (
              <Link
                href={action.href}
                className="rounded-full bg-white px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-black shadow-sm transition-all duration-200 hover:bg-neutral-100 hover:scale-105 shrink-0"
              >
                {action.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-full bg-white px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-black shadow-sm transition-all duration-200 hover:bg-neutral-100 hover:scale-105 shrink-0 cursor-pointer"
              >
                {action.label}
              </button>
            )
          ) : null}

          {/* Mobile hamburger toggle (always at far right) */}
          <button
            ref={buttonRef}
            type="button"
            className="flex size-9 items-center justify-center rounded-full text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all md:hidden shrink-0 cursor-pointer"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? (
              <X className="size-5 pointer-events-none" />
            ) : (
              <Menu className="size-5 pointer-events-none" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown Card */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-nav-menu"
          className="mt-2.5 mx-auto max-w-[820px] rounded-2xl bg-[#18181b] p-3 border border-white/15 shadow-2xl md:hidden relative z-50 transition-all duration-200"
        >
          {/* User Profile summary if logged in (Mobile) */}
          {userMenu && (
            <div className="mb-3 rounded-xl bg-white/5 p-3 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black font-bold text-xs">
                  {userMenu.name
                    ? userMenu.name.slice(0, 2).toUpperCase()
                    : <User className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{userMenu.name || 'Guru'}</p>
                  <p className="text-[11px] text-white/60 truncate">{userMenu.email}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/10">
                <Link
                  href="/guru/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                >
                  <User className="size-3.5" /> Profil
                </Link>
                {userMenu.onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      userMenu.onSignOut?.()
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/20 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 cursor-pointer"
                  >
                    <LogOut className="size-3.5" /> Keluar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Links with proper touch targets and active indicator */}
          <ul className="flex flex-col gap-1">
            {links.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between min-h-[44px] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-white/15 text-white font-bold'
                        : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15',
                    )}
                  >
                    <span>{item.label}</span>
                    {active && <span className="size-2 rounded-full bg-lime shrink-0" />}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Fallback Action CTA in drawer if not already rendered or for mobile reachability */}
          {action && !userMenu && (
            <div className="mt-3 pt-3 border-t border-white/10">
              {action.href ? (
                <Link
                  href={action.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full min-h-[42px] rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm hover:bg-neutral-100"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    action.onClick?.()
                  }}
                  className="flex items-center justify-center w-full min-h-[42px] rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm hover:bg-neutral-100 cursor-pointer"
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
