'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getRecognition, pageHidden, playBeep, type Recognition } from './speech'

export type VoiceStopReason = 'unsupported' | 'blocked' | 'no-mic' | 'offline'

const POLL_MS = 250
/**
 * A session that ends this fast without hearing speech or returning text means the engine isn't working.
 * Arc, Brave and other Chromium browsers expose webkitSpeechRecognition but lack Google's speech service,
 * so they fail immediately (often with a 'network' error, sometimes silently).
 */
const DEAD_SESSION_MS = 800
const MAX_DEAD_SESSIONS = 3
/** Chrome can leave speechSynthesis.speaking stuck at true; don't wait forever for the page to stop talking. */
const MAX_WAIT_FOR_SPEECH_MS = 60_000
/** Some engines never fire `onend` after `abort()`; don't wait for it longer than this. */
const ABORT_WAIT_MS = 1000

const isSpeaking = () => typeof window !== 'undefined' && Boolean(window.speechSynthesis?.speaking)

/**
 * Hands-free voice mode: turned on once, it keeps listening. Each time the page finishes speaking it starts a
 * new recognition session (after a beep), hands the transcript to `onTranscript`, and repeats. It never listens
 * while the page is talking (the mic would transcribe the page's own voice) or while the tab is hidden.
 * Stops by itself, with a reason, when the browser can't recognize speech.
 */
export function useVoiceMode(options: {
  /** Whether the current step accepts voice input (e.g. not while loading or on the result screen). */
  canListen: () => boolean
  onTranscript: (text: string) => void
  onStop?: (reason: VoiceStopReason) => void
}) {
  // Always call the latest callbacks, so handlers see the current exam step instead of a stale one.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [active, setActive] = useState(false)
  const [listening, setListening] = useState(false)
  const activeRef = useRef(false)
  const recRef = useRef<Recognition | null>(null)
  /** A session we aborted that hasn't fired `onend` yet. Chrome allows one session at a time, so wait for it. */
  const endingRef = useRef<{ rec: Recognition; since: number } | null>(null)
  const deadSessionsRef = useRef(0)
  const spokeSinceListenRef = useRef(true)
  const speakingSinceRef = useRef<number | null>(null)

  const abortSession = useCallback(() => {
    const rec = recRef.current
    recRef.current = null
    setListening(false)
    if (!rec) return
    endingRef.current = { rec, since: Date.now() }
    rec.abort()
  }, [])

  const stop = useCallback(
    (reason?: VoiceStopReason) => {
      activeRef.current = false
      setActive(false)
      abortSession()
      setListening(false)
      if (reason) optionsRef.current.onStop?.(reason)
    },
    [abortSession],
  )

  const startSession = useCallback(() => {
    const rec = getRecognition()
    if (!rec) return stop('unsupported')
    recRef.current = rec
    const startedAt = Date.now()
    let heard = false
    let gotResult = false

    rec.onspeechstart = () => {
      heard = true
    }
    rec.onresult = (e) => {
      gotResult = true
      deadSessionsRef.current = 0
      const text = e.results[0]?.[0]?.transcript?.trim()
      if (text && activeRef.current) optionsRef.current.onTranscript(text)
    }
    rec.onerror = (e) => {
      // 'aborted' is us (page started talking, tab hidden, mode off); 'no-speech' just means silence.
      if (e.error === 'aborted' || e.error === 'no-speech') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') return stop('blocked')
      if (e.error === 'audio-capture') return stop('no-mic')
      if (e.error === 'network') return stop(navigator.onLine ? 'unsupported' : 'offline')
      if (e.error === 'language-not-supported') return stop('unsupported')
    }
    rec.onend = () => {
      if (endingRef.current?.rec === rec) endingRef.current = null
      // Aborted by us (page started talking, tab hidden, mode off): not a sign the engine is broken.
      if (recRef.current !== rec) return
      recRef.current = null
      setListening(false)
      const dead = !heard && !gotResult && Date.now() - startedAt < DEAD_SESSION_MS
      deadSessionsRef.current = dead ? deadSessionsRef.current + 1 : 0
      if (deadSessionsRef.current >= MAX_DEAD_SESSIONS && activeRef.current) stop('unsupported')
    }

    // "Your turn" cue after the page has spoken; not repeated while the student stays silent.
    if (spokeSinceListenRef.current) playBeep()
    spokeSinceListenRef.current = false
    setListening(true)
    try {
      rec.start()
    } catch {
      recRef.current = null
      setListening(false)
      stop('unsupported')
    }
  }, [stop])

  const pageIsTalking = () => {
    if (!isSpeaking()) {
      speakingSinceRef.current = null
      return false
    }
    speakingSinceRef.current ??= Date.now()
    spokeSinceListenRef.current = true
    return Date.now() - speakingSinceRef.current < MAX_WAIT_FOR_SPEECH_MS
  }

  // The loop: listen whenever the page is quiet and the step accepts voice; stop listening when it talks.
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      if (!activeRef.current) return
      const blocked = pageIsTalking() || pageHidden() || !optionsRef.current.canListen()
      if (recRef.current) {
        if (blocked) abortSession()
        return
      }
      const ending = endingRef.current
      if (ending && Date.now() - ending.since < ABORT_WAIT_MS) return
      endingRef.current = null
      if (!blocked) startSession()
    }, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startSession, abortSession])

  useEffect(
    () => () => {
      activeRef.current = false
      abortSession()
    },
    [abortSession],
  )

  const start = useCallback(() => {
    if (activeRef.current) return
    activeRef.current = true
    deadSessionsRef.current = 0
    spokeSinceListenRef.current = true
    setActive(true)
  }, [])

  const toggle = useCallback(() => (activeRef.current ? stop() : start()), [start, stop])

  return { active, listening, start, stop: () => stop(), toggle }
}
