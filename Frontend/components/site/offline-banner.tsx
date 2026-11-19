'use client'

import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#111] px-4 py-2.5 text-sm font-medium text-white">
      <WifiOff className="size-4" aria-hidden="true" />
      Tanpa internet. Materi yang sudah dibuka tetap bisa dipakai; fitur yang butuh internet dinonaktifkan.
    </div>
  )
}
