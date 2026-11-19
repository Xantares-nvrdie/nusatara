'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, getExamByPin, submitExam } from './store'
import type { Exam, Letter, Submission } from './types'

export type Phase = 'name' | 'pin' | 'loading' | 'question' | 'review' | 'submitting' | 'result' | 'error'

type Saved = { name: string; pin: string; attemptId: string; answers: Record<number, Letter | null>; index: number }

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // ignore
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function useExamAttempt(portal: 'tunanetra' | 'tunarungu') {
  const key = `attempt:${portal}`
  const [phase, setPhase] = useState<Phase>('name')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [exam, setExam] = useState<Exam | null>(null)
  const [answers, setAnswers] = useState<Record<number, Letter | null>>({})
  const [index, setIndex] = useState(0)
  const [attemptId, setAttemptId] = useState('')
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const [result, setResult] = useState<Submission | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(key)
    if (!raw) return
    const s = JSON.parse(raw) as Saved
    setName(s.name)
    setPin(s.pin)
    setAnswers(s.answers)
    setIndex(s.index)
    setAttemptId(s.attemptId)
    getExamByPin(s.pin)
      .then((e) => {
        setExam(e)
        setPhase('question')
      })
      .catch(() => sessionStorage.removeItem(key))
  }, [key])

  useEffect(() => {
    if (exam && attemptId && phase !== 'result') {
      sessionStorage.setItem(key, JSON.stringify({ name, pin, attemptId, answers, index } satisfies Saved))
    }
  }, [key, exam, attemptId, name, pin, answers, index, phase])

  const fail = (err: unknown) => {
    setError(err instanceof ApiError ? { code: err.code, message: err.message } : { code: 'UNKNOWN', message: 'Terjadi kesalahan.' })
    setPhase('error')
  }

  const confirmName = useCallback((value: string) => {
    if (!value.trim()) return false
    setName(value.trim())
    setPhase('pin')
    return true
  }, [])

  const loadPin = useCallback(async (value: string) => {
    if (!/^\d{4}$/.test(value)) return false
    setPin(value)
    setPhase('loading')
    try {
      const e = await getExamByPin(value)
      setExam(e)
      setAnswers({})
      setIndex(0)
      setAttemptId(safeUUID())
      setPhase('question')
    } catch (err) {
      fail(err)
    }
    return true
  }, [])

  const answer = useCallback((id: number, letter: Letter) => setAnswers((a) => ({ ...a, [id]: letter })), [])

  const submit = useCallback(async () => {
    if (!exam) return
    setPhase('submitting')
    try {
      const { submission } = await submitExam({ pin, attemptId, studentName: name, answers })
      sessionStorage.removeItem(key)
      setResult(submission)
      setPhase('result')
    } catch (err) {
      fail(err)
    }
  }, [exam, pin, attemptId, name, answers, key])

  const reset = useCallback(() => {
    sessionStorage.removeItem(key)
    setExam(null)
    setPin('')
    setAnswers({})
    setIndex(0)
    setResult(null)
    setError(null)
    setPhase('name')
  }, [key])

  const retry = useCallback(() => {
    if (exam && attemptId) submit()
    else setPhase('pin')
  }, [exam, attemptId, submit])

  return { phase, setPhase, name, pin, exam, answers, index, setIndex, error, result, confirmName, loadPin, answer, submit, reset, retry }
}
