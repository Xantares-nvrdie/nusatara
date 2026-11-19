'use client'

import { useSyncExternalStore } from 'react'
import { api, ApiError } from './api'
import { DEMO_TEACHER, SEED_EXAMS, SEED_MODULES, SEED_SUBMISSIONS } from './seed'
import type { Exam, LearningModule, Letter, Question, Submission, Teacher } from './types'

export { ApiError }

type Account = Teacher & { password: string }

type State = {
  teacher: Teacher | null
  accounts: Account[]
  modules: LearningModule[]
  exams: Exam[]
  submissions: Submission[]
}

const STORAGE_KEY = 'ruang-inklusi-demo-v1'

const initialState: State = {
  teacher: null,
  accounts: [
    DEMO_TEACHER,
    { name: 'Sari Wulandari, S.Pd.', email: 'guru@nusatara.id', password: 'password123' },
    { name: 'Yohanes Kambu, S.Pd.', email: 'guru2@nusatara.id', password: 'password123' },
  ],
  modules: SEED_MODULES,
  exams: SEED_EXAMS,
  submissions: SEED_SUBMISSIONS,
}

let state: State = initialState
let loaded = false
let syncing = false
const listeners = new Set<() => void>()

function normalizeModule(m: any): LearningModule {
  return {
    id: m.id,
    title: m.title,
    teacherName: m.teacherName || 'Guru',
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
    originalText: m.rawContent || m.originalText || '',
    rawContent: m.rawContent || m.originalText || '',
    blindAudioScript: m.blindAudioScript || '',
    deafVisualSummary: m.deafVisualSummary,
  }
}

function normalizeExam(e: any): Exam {
  const qs = (e.questions || []).map((q: any, i: number) => ({
    id: q.id ?? i + 1,
    text: q.question ?? q.text ?? `Soal ${i + 1}`,
    question: q.question ?? q.text,
    options: q.options || { A: '', B: '', C: '', D: '' },
    answer: q.correctAnswer ?? q.answer ?? 'A',
    correctAnswer: q.correctAnswer ?? q.answer ?? 'A',
  }))

  return {
    id: e.id,
    title: e.title,
    pin: e.pin,
    moduleId: e.moduleId ?? null,
    status: e.isActive === false || e.status === 'closed' ? 'closed' : 'active',
    isActive: e.isActive ?? (e.status === 'active'),
    questions: qs,
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
  }
}

function normalizeSubmission(s: any): Submission {
  return {
    id: s.id || s.submissionId,
    examId: s.examId || '',
    attemptId: s.attemptId || s.id,
    studentName: s.studentName,
    answers: s.answers || {},
    correctCount: s.correctCount ?? 0,
    totalQuestions: s.totalQuestions ?? 0,
    answeredCount: s.answeredCount ?? 0,
    score: s.score ?? 0,
    createdAt: typeof s.submittedAt === 'string'
      ? s.submittedAt
      : s.submittedAt
      ? new Date(s.submittedAt).toISOString()
      : s.createdAt || new Date().toISOString(),
  }
}

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...initialState, ...JSON.parse(raw) }
  } catch {
    // Corrupt demo storage falls back to seed data.
  }

  // Initial async sync with backend
  syncWithBackend()
}

async function syncWithBackend() {
  if (syncing || typeof window === 'undefined') return
  syncing = true
  try {
    // 1. Check auth session
    try {
      const session = await api<{ user?: { name: string; email: string } } | null>('/auth/get-session')
      if (session?.user) {
        setState((s) => ({ ...s, teacher: { name: session.user!.name, email: session.user!.email } }))
      } else {
        // Try profile endpoint
        try {
          const profile = await api<{ name: string; email: string }>('/profile')
          if (profile?.name) {
            setState((s) => ({ ...s, teacher: { name: profile.name, email: profile.email } }))
          }
        } catch {
          // not signed in
        }
      }
    } catch {
      // Backend auth check failed; keep current state
    }

    // 2. Fetch public modules
    try {
      const res = await api<{ items: any[] }>('/modules?pageSize=50')
      if (res?.items && Array.isArray(res.items)) {
        // Detailed module loading or map items
        const remoteModules = res.items.map(normalizeModule)
        if (remoteModules.length > 0) {
          setState((s) => {
            const remoteIds = new Set(remoteModules.map((m) => m.id))
            const combined = [...remoteModules, ...s.modules.filter((m) => !remoteIds.has(m.id))]
            return { ...s, modules: combined }
          })
        }
      }
    } catch {
      // Backend modules unavailable
    }

    // 3. If teacher is logged in, sync exams and teacher modules
    if (state.teacher) {
      await syncTeacherData()
    }
  } catch (err) {
    console.warn('[store] Backend sync failed, using local/cached state:', err)
  } finally {
    syncing = false
  }
}

async function syncTeacherData() {
  try {
    // Sync teacher modules
    try {
      const mineRes = await api<{ items: any[] }>('/modules/mine?pageSize=50')
      if (mineRes?.items && Array.isArray(mineRes.items)) {
        const mine = mineRes.items.map(normalizeModule)
        setState((s) => {
          const mineIds = new Set(mine.map((m) => m.id))
          return { ...s, modules: [...mine, ...s.modules.filter((m) => !mineIds.has(m.id))] }
        })
      }
    } catch {
      // ignore
    }

    // Sync exams
    try {
      const examsRes = await api<{ items: any[] }>('/exams?pageSize=50')
      if (examsRes?.items && Array.isArray(examsRes.items)) {
        // The server is the source of truth for a signed-in teacher. Merging kept the local demo exams
        // (PIN 1234/5678) next to real ones, so the list showed two active exams with the same PIN.
        const remoteExams = examsRes.items.map(normalizeExam)
        setState((s) => ({ ...s, exams: remoteExams }))
      }
    } catch {
      // ignore
    }

    // Sync submissions
    try {
      const subRes = await api<{ items: any[] }>('/submissions?pageSize=50') // API max is 50
      if (subRes?.items && Array.isArray(subRes.items)) {
        // Same as exams: demo submissions belong to the demo exams, so they go too.
        const remoteSubs = subRes.items.map(normalizeSubmission)
        setState((s) => ({ ...s, submissions: remoteSubs }))
      }
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('[store] syncTeacherData failed:', err)
  }
}

function setState(updater: (s: State) => State) {
  load()
  state = updater(state)
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or disabled; keep in-memory state.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  load()
  return state
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(initialState),
  )
}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()))

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */
export async function signIn(email: string, password: string) {
  try {
    // Try Better Auth backend
    const res = await api<{ user?: { name: string; email: string } }>('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const name = res?.user?.name || email.split('@')[0]
    setState((s) => ({ ...s, teacher: { name, email } }))
    await syncTeacherData()
    return
  } catch (err: any) {
    // If backend reports invalid credentials, throw directly
    if (err?.code === 'INVALID_CREDENTIALS' || err?.status === 401 || err?.status === 400) {
      // Also check local demo accounts fallback
      const acct = getSnapshot().accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
      if (acct && acct.password === password) {
        setState((s) => ({ ...s, teacher: { name: acct.name, email: acct.email } }))
        return
      }
      throw new ApiError('INVALID_CREDENTIALS', err?.message || 'Email atau kata sandi salah.')
    }

    // If connection/network failed, fallback to local demo accounts
    const acct = getSnapshot().accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
    if (acct && acct.password === password) {
      setState((s) => ({ ...s, teacher: { name: acct.name, email: acct.email } }))
      return
    }

    throw new ApiError('NETWORK', err?.message || 'Gagal terhubung ke server autentikasi.')
  }
}

export async function signUp(name: string, email: string, password: string) {
  if (password.length < 8) throw new ApiError('PASSWORD_WEAK', 'Kata sandi minimal 8 karakter.')

  try {
    // Try Better Auth backend
    const res = await api<{ user?: { name: string; email: string } }>('/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })

    setState((s) => ({
      ...s,
      accounts: [...s.accounts, { name, email, password }],
      teacher: { name: res?.user?.name || name, email },
    }))
    await syncTeacherData()
    return
  } catch (err: any) {
    if (err?.code === 'USER_ALREADY_EXISTS' || err?.message?.toLowerCase().includes('already') || err?.status === 409) {
      throw new ApiError('EMAIL_TAKEN', 'Email ini sudah terdaftar. Silakan masuk.')
    }

    // Check local fallback
    if (getSnapshot().accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError('EMAIL_TAKEN', 'Email ini sudah terdaftar. Silakan masuk.')
    }

    // Save locally if offline
    setState((s) => ({
      ...s,
      accounts: [...s.accounts, { name, email, password }],
      teacher: { name, email },
    }))
  }
}

export async function signOut() {
  try {
    await api('/auth/sign-out', { method: 'POST', body: JSON.stringify({}) })
  } catch {
    // ignore
  }
  setState((s) => ({ ...s, teacher: null }))
}

export async function updateProfile(name: string) {
  try {
    await api('/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
  } catch {
    // ignore
  }

  setState((s) => ({
    ...s,
    teacher: s.teacher ? { ...s.teacher, name } : s.teacher,
    accounts: s.accounts.map((a) => (a.email === s.teacher?.email ? { ...a, name } : a)),
  }))
}

/* ------------------------------------------------------------------ */
/* Modules                                                            */
/* ------------------------------------------------------------------ */
export async function createModule(input: Omit<LearningModule, 'id' | 'createdAt' | 'teacherName'>) {
  try {
    const res = await api<any>('/modules', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        rawContent: input.originalText || input.rawContent || '',
        blindAudioScript: input.blindAudioScript,
        deafVisualSummary: input.deafVisualSummary,
      }),
    })

    const mod = normalizeModule(res)
    setState((s) => ({ ...s, modules: [mod, ...s.modules.filter((m) => m.id !== mod.id)] }))
    return mod
  } catch (err) {
    console.warn('[store] createModule backend failed, saving locally:', err)
    // Fallback to local
    const mod: LearningModule = {
      ...input,
      id: `mod-${uid().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      teacherName: getSnapshot().teacher?.name ?? 'Guru',
    }
    setState((s) => ({ ...s, modules: [mod, ...s.modules] }))
    return mod
  }
}

export async function fetchModuleById(id: string): Promise<LearningModule | null> {
  const cached = getSnapshot().modules.find((m) => m.id === id)
  if (cached && (cached.blindAudioScript || cached.deafVisualSummary)) {
    return cached
  }

  try {
    const res = await api<any>(`/modules/${id}`)
    const full = normalizeModule(res)
    setState((s) => ({
      ...s,
      modules: [full, ...s.modules.filter((m) => m.id !== id)],
    }))
    return full
  } catch (err) {
    console.warn(`[store] fetchModuleById failed for ${id}:`, err)
    return cached || null
  }
}

/* ------------------------------------------------------------------ */
/* Exams                                                              */
/* ------------------------------------------------------------------ */
export async function createExam(input: { title: string; moduleId: string | null; questions: Question[] }) {
  try {
    const res = await api<any>('/exams', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        moduleId: input.moduleId || null,
        questions: input.questions.map((q) => ({
          question: q.text || q.question || '',
          options: q.options,
          correctAnswer: q.answer || q.correctAnswer || 'A',
        })),
      }),
    })

    const exam = normalizeExam(res)
    setState((s) => ({ ...s, exams: [exam, ...s.exams.filter((e) => e.id !== exam.id)] }))
    return exam
  } catch (err: any) {
    // The server answered with a real error (validation, PINs full, ...): show it instead of faking an exam.
    // Only a network failure or a local demo login (401) falls back to a device-only exam.
    if (err?.status && err.status !== 401) throw err
    console.warn('[store] createExam backend failed, saving locally:', err)
    // Fallback to local
    const active = new Set(getSnapshot().exams.filter((e) => e.status === 'active').map((e) => e.pin))
    let pin = '1000'
    for (let i = 0; i < 200; i++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000))
      if (!active.has(candidate)) {
        pin = candidate
        break
      }
    }
    const exam: Exam = {
      ...input,
      id: `exam-${uid().slice(0, 8)}`,
      pin,
      status: 'active',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setState((s) => ({ ...s, exams: [exam, ...s.exams] }))
    return exam
  }
}

const SERVER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function setExamStatus(id: string, status: Exam['status']) {
  // Server exams (UUID ids) only change when the server agrees, e.g. reopening fails with 409 PIN_CONFLICT
  // if another active exam took the PIN. Device-only demo exams are toggled locally.
  if (SERVER_ID.test(id)) {
    await api(`/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: status === 'active' }),
    })
  }

  setState((st) => ({
    ...st,
    exams: st.exams.map((e) => (e.id === id ? { ...e, status, isActive: status === 'active' } : e)),
  }))
}

export async function getExamByPin(pin: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const local = getSnapshot().exams.find((e) => e.pin === pin && (e.status === 'active' || e.isActive))
    if (!local) throw new ApiError('NETWORK', 'Tidak ada koneksi dan PIN tidak ditemukan di cache.')
    return local
  }

  try {
    const res = await api<any>(`/exams/${pin}`)
    const questions: Question[] = (res.questions || []).map((q: any) => ({
      id: q.id,
      text: q.question || q.text,
      question: q.question,
      options: q.options,
      answer: 'A', // Answer key is safely stripped on server
    }))

    const exam: Exam = {
      id: res.id,
      title: res.title,
      pin,
      status: 'active',
      isActive: true,
      moduleId: null,
      questions,
      createdAt: new Date().toISOString(),
    }
    return exam
  } catch (err: any) {
    // If backend returns PIN_NOT_FOUND or EXAM_CLOSED
    if (err?.code === 'EXAM_CLOSED') {
      throw new ApiError('EXAM_CLOSED', 'Ujian sudah ditutup oleh guru.')
    }
    if (err?.code === 'PIN_NOT_FOUND' || err?.status === 404) {
      // The server is reachable and has no active exam with this PIN. Don't fall back to a local demo exam
      // with the same PIN: its answers could never be submitted (the server would reject them too).
      throw new ApiError('PIN_NOT_FOUND', 'PIN tidak ditemukan atau ujian sudah ditutup.')
    }

    // Fallback to local cache if network problem
    const local = getSnapshot().exams.find((e) => e.pin === pin && (e.status === 'active' || e.isActive))
    if (local) return local

    throw new ApiError('NETWORK', err?.message || 'Gagal mengambil soal ujian.')
  }
}

export async function submitExam(input: {
  pin: string
  attemptId: string
  studentName: string
  answers: Record<number, Letter | null>
}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ApiError('NETWORK', 'Tidak ada koneksi.')

  try {
    const formattedAnswers = Object.entries(input.answers).map(([qid, ans]) => ({
      questionId: Number(qid),
      answer: ans,
    }))

    const res = await api<any>(`/exams/${input.pin}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        attemptId: input.attemptId,
        studentName: input.studentName,
        answers: formattedAnswers,
      }),
    })

    const submission: Submission = {
      id: res.submissionId || `sub-${uid().slice(0, 8)}`,
      examId: res.examId || '',
      attemptId: input.attemptId,
      studentName: res.studentName || input.studentName,
      answers: input.answers,
      correctCount: res.correctCount,
      totalQuestions: res.totalQuestions,
      answeredCount: res.answeredCount,
      score: res.score,
      createdAt: typeof res.submittedAt === 'string'
        ? res.submittedAt
        : res.submittedAt
        ? new Date(res.submittedAt).toISOString()
        : new Date().toISOString(),
    }

    setState((st) => ({
      ...st,
      submissions: [submission, ...st.submissions.filter((x) => x.attemptId !== input.attemptId)],
    }))

    return { submission, status: 201 as const }
  } catch (err: any) {
    if (err?.code === 'EXAM_CLOSED' || err?.status === 409) {
      throw new ApiError('EXAM_CLOSED', 'Ujian sudah ditutup oleh guru.')
    }
    if (err?.code === 'PIN_NOT_FOUND' || err?.status === 404) {
      throw new ApiError('PIN_NOT_FOUND', 'PIN ujian tidak ditemukan.')
    }

    // Local fallback if backend is unreachable
    console.warn('[store] submitExam backend failed, scoring locally:', err)
    const s = getSnapshot()
    const exam = s.exams.find((e) => e.pin === input.pin)
    if (!exam || exam.status !== 'active') throw new ApiError('EXAM_CLOSED', 'Ujian sudah ditutup oleh guru.')

    const correctCount = exam.questions.filter((q) => input.answers[q.id] === q.answer).length
    const answeredCount = exam.questions.filter((q) => input.answers[q.id]).length
    const submission: Submission = {
      id: `sub-${uid().slice(0, 8)}`,
      examId: exam.id,
      attemptId: input.attemptId,
      studentName: input.studentName,
      answers: input.answers,
      correctCount,
      totalQuestions: exam.questions.length,
      answeredCount,
      score: Math.round((correctCount / exam.questions.length) * 100),
      createdAt: new Date().toISOString(),
    }
    setState((st) => ({ ...st, submissions: [submission, ...st.submissions] }))
    return { submission, status: 201 as const }
  }
}

export function examStats(examId: string, submissions: Submission[]) {
  const list = submissions.filter((s) => s.examId === examId)
  if (list.length > 0) {
    const averageScore = Math.round(list.reduce((a, b) => a + b.score, 0) / list.length)
    return { count: list.length, averageScore }
  }

  // Precomputed stats from backend list query
  const exam = getSnapshot().exams.find((e: any) => e.id === examId) as any
  if (exam && (exam.submissionCount !== undefined || exam.averageScore !== undefined)) {
    return {
      count: exam.submissionCount ?? 0,
      averageScore: exam.averageScore ?? null,
    }
  }

  return { count: 0, averageScore: null }
}
