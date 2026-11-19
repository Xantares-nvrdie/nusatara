'use client'

import { useEffect } from 'react'

/**
 * Stops text-to-speech when the student leaves the tab (switches tab/app, locks the phone, closes the page).
 * Browsers keep speechSynthesis talking in background tabs, which confused students who had already moved on.
 * Mounted once in the root layout so it covers every page, including ones that call speechSynthesis directly.
 */
export function SpeechGuard() {
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const stop = () => window.speechSynthesis.cancel()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', stop)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', stop)
    }
  }, [])
  return null
}
