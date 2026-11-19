'use client'

export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function hasIndonesianVoice() {
  if (!ttsSupported()) return false
  return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('id'))
}

/** True while the tab is in the background. Browsers keep speechSynthesis running there, so we stay silent. */
export function pageHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.()
    return
  }
  // Timers and recognition callbacks can still fire in a background tab; don't start talking there.
  if (pageHidden()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'id-ID'
  utter.rate = opts.rate ?? 1
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('id'))
  if (voice) utter.voice = voice
  utter.onend = () => opts.onEnd?.()
  utter.onerror = () => opts.onEnd?.()
  synth.speak(utter)
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel()
}

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

export function getRecognition(): RecognitionLike | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike
    webkitSpeechRecognition?: new () => RecognitionLike
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'id-ID'
  rec.continuous = false
  rec.interimResults = false
  return rec
}

export function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    // Audio context can be unavailable before a user gesture.
  }
}
