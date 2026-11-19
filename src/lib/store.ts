'use client'
import { useSyncExternalStore } from 'react'
import { api, ApiError } from './api'
import type { Exam, LearningModule, Letter, Question, Submission, Teacher } from './types'
export { ApiError }

/**
 * Client cache of server data. Everything here comes from the API (and so from the database):
 * there is no demo data and no device-only fallback. When the server can't be reached, actions throw
 * so the UI can say so, instead of pretending to save.
 */
type State = {
  teacher: Teacher | null
  /** Public module list; entries are replaced by the full module once a detail page loads it. */
  modules: LearningModule[]
  /** Ids of the signed-in teacher's own modules (GET /modules/mine). */
  myModuleIds: string[]
  /** The signed-in teacher's exams and submissions. Empty when nobody is signed in. */
  exams: Exam[]
  submissions: Submission[]
}

// v2: the old key held browser-only demo data (PIN 1234/5678, demo accounts); a new key drops it.
const STORAGE_KEY = 'nusatara-cache-v2'
const LEGACY_STORAGE_KEYS = ['ruang-inklusi-demo-v1']
const PAGE_SIZE = 50 // the API maximum

const initialState: State = { teacher: null, modules: [], myModuleIds: [], exams: [], submissions: [] }
const signedOut = { teacher: null, myModuleIds: [], exams: [], submissions: [] } satisfies Partial<State>

let state: State = initialState
let loaded = false
let syncing = false
const listeners = new Set<() => void>()

const toIso = (d: unknown) => (typeof d === 'string' ? d : d ? new Date(d as string).toISOString() : new Date().toISOString())

function normalizeModule(m: any): LearningModule {
  return {
    id: m.id,
    title: m.title,
    teacherName: m.teacherName || 'Guru',
    createdAt: toIso(m.createdAt),
    summary: m.summary ?? m.deafVisualSummary?.summary,
    originalText: m.rawContent || m.originalText || '',
    rawContent: m.rawContent || m.originalText || '',
    blindAudioScript: m.blindAudioScript || '',
    deafVisualSummary: m.deafVisualSummary,
  }
}

const isFull = (m: LearningModule | undefined) => Boolean(m && (m.blindAudioScript || m.deafVisualSummary))

function normalizeExam(e: any): Exam {
  const questions: Question[] = (e.questions || []).map((q: any, i: number) => ({
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
    status: e.isActive === false ? 'closed' : 'active',
    isActive: e.isActive !== false,
    questions,
    createdAt: toIso(e.createdAt),
    questionCount: e.questionCount ?? questions.length,
    submissionCount: e.submissionCount,
    averageScore: e.averageScore,
  }
}

/** GET /submissions sends answers as [{questionId, answer, isCorrect}]; the UI wants {questionId: answer}. */
function normalizeSubmission(s: any): Submission {
  const list: { questionId: number; answer: Letter | null }[] = Array.isArray(s.answers) ? s.answers : []
  const answers: Record<number, Letter | null> = Array.isArray(s.answers)
    ? Object.fromEntries(list.map((a) => [a.questionId, a.answer]))
    : s.answers || {}
  return {
    id: s.id,
    examId: s.examId,
    attemptId: s.attemptId ?? s.id,
    studentName: s.studentName,
    answers,
    correctCount: s.correctCount ?? 0,
    totalQuestions: s.totalQuestions ?? 0,
    answeredCount: s.answeredCount ?? Object.values(answers).filter(Boolean).length,
    score: s.score ?? 0,
    createdAt: toIso(s.submittedAt ?? s.createdAt),
  }
}

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    for (const key of LEGACY_STORAGE_KEYS) window.sessionStorage.removeItem(key)
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...initialState, ...JSON.parse(raw) }
  } catch {
    // Corrupt cache: start empty and refetch.
  }
  syncWithBackend()
}

/** Keeps already-loaded full modules when the (lighter) list arrives again. */
function mergeModules(current: LearningModule[], incoming: LearningModule[], keepOthers: boolean) {
  const byId = new Map(current.map((m) => [m.id, m]))
  const merged = incoming.map((m) => (isFull(byId.get(m.id)) ? { ...byId.get(m.id)!, summary: m.summary } : m))
  if (!keepOthers) return merged
  const ids = new Set(merged.map((m) => m.id))
  return [...merged, ...current.filter((m) => !ids.has(m.id))]
}

async function syncWithBackend() {
  if (syncing || typeof window === 'undefined') return
  syncing = true
  try {
    // 1. Session. A reachable server saying "no session" signs the cached teacher out.
    try {
      const session = await api<{ user?: { name: string; email: string } } | null>('/auth/get-session')
      if (session?.user) {
        setState((s) => ({ ...s, teacher: { name: session.user!.name, email: session.user!.email } }))
      } else {
        setState((s) => ({ ...s, ...signedOut }))
      }
    } catch {
      // Server unreachable: keep the cached view until it's back.
    }

    // 2. Public module list (what students see).
    try {
      const res = await api<{ items: any[] }>(`/modules?pageSize=${PAGE_SIZE}`)
      const remote = (res.items ?? []).map(normalizeModule)
      setState((s) => ({ ...s, modules: mergeModules(s.modules, remote, false) }))
    } catch {
      // Keep the cached list while offline.
    }

    if (state.teacher) await syncTeacherData()
  } finally {
    syncing = false
  }
}

async function syncTeacherData() {
  const [mine, examsRes, subRes] = await Promise.allSettled([
    api<{ items: any[] }>(`/modules/mine?pageSize=${PAGE_SIZE}`),
    api<{ items: any[] }>(`/exams?pageSize=${PAGE_SIZE}`),
    api<{ items: any[] }>(`/submissions?pageSize=${PAGE_SIZE}`),
  ])
  if (mine.status === 'fulfilled') {
    const items = (mine.value.items ?? []).map(normalizeModule)
    setState((s) => ({ ...s, myModuleIds: items.map((m) => m.id), modules: mergeModules(s.modules, items, true) }))
  }
  if (examsRes.status === 'fulfilled') {
    setState((s) => ({ ...s, exams: (examsRes.value.items ?? []).map(normalizeExam) }))
  }
  if (subRes.status === 'fulfilled') {
    setState((s) => ({ ...s, submissions: (subRes.value.items ?? []).map(normalizeSubmission) }))
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

/** Network failures (no HTTP status) become one clear message instead of a raw fetch error. */
function networkError(err: any, message = 'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.') {
  return err?.status ? err : new ApiError('NETWORK', message)
}

/* ------------------------------------------------------------------ */
/* Auth                                                               */
/* ------------------------------------------------------------------ */
export async function signIn(email: string, password: string) {
  try {
    const res = await api<{ user?: { name: string; email: string } }>('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setState((s) => ({ ...s, teacher: { name: res?.user?.name || email.split('@')[0], email: res?.user?.email || email } }))
  } catch (err: any) {
    if (err?.code === 'INVALID_EMAIL_OR_PASSWORD' || err?.status === 401 || err?.status === 400) {
      throw new ApiError('INVALID_CREDENTIALS', 'Email atau kata sandi salah.')
    }
    throw networkError(err)
  }
  await syncTeacherData()
}

export async function signUp(name: string, email: string, password: string) {
  if (password.length < 8) throw new ApiError('PASSWORD_WEAK', 'Kata sandi minimal 8 karakter.')
  try {
    const res = await api<{ user?: { name: string; email: string } }>('/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    setState((s) => ({ ...s, teacher: { name: res?.user?.name || name, email: res?.user?.email || email } }))
  } catch (err: any) {
    if (
      err?.code?.includes?.('USER_ALREADY_EXISTS') ||
      err?.message?.toLowerCase().includes('already') ||
      err?.status === 409 ||
      err?.status === 422
    ) {
      throw new ApiError('EMAIL_TAKEN', 'Email ini sudah terdaftar. Silakan masuk.')
    }
    throw networkError(err)
  }
  await syncTeacherData()
}

export async function signOut() {
  try {
    await api('/auth/sign-out', { method: 'POST', body: JSON.stringify({}) })
  } finally {
    // Clear the teacher's data from this (possibly shared) device even if the request failed.
    setState((s) => ({ ...s, ...signedOut }))
  }
}

export async function updateProfile(name: string) {
  try {
    await api('/profile', { method: 'PATCH', body: JSON.stringify({ name }) })
  } catch (err) {
    throw networkError(err)
  }
  setState((s) => ({ ...s, teacher: s.teacher ? { ...s.teacher, name } : s.teacher }))
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
    setState((s) => ({
      ...s,
      modules: [mod, ...s.modules.filter((m) => m.id !== mod.id)],
      myModuleIds: [mod.id, ...s.myModuleIds.filter((id) => id !== mod.id)],
    }))
    return mod
  } catch (err) {
    throw networkError(err)
  }
}

/** Saves a teacher's edits to their own module (the server answers 404 for anyone else's). */
export async function updateModule(
  id: string,
  input: Pick<LearningModule, 'title' | 'rawContent' | 'blindAudioScript' | 'deafVisualSummary'>,
) {
  try {
    const res = await api<any>(`/modules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: input.title,
        rawContent: input.rawContent,
        blindAudioScript: input.blindAudioScript,
        deafVisualSummary: input.deafVisualSummary,
      }),
    })
    const mod = normalizeModule(res)
    freshModuleIds.add(id)
    setState((s) => ({ ...s, modules: s.modules.map((m) => (m.id === id ? mod : m)) }))
    return mod
  } catch (err) {
    throw networkError(err)
  }
}

/**
 * Modules fetched (or saved) since this page load. A cached copy from an earlier visit may be older than a
 * teacher's edit, so it is refreshed in the background once per page load.
 */
const freshModuleIds = new Set<string>()

async function loadFullModule(id: string) {
  const full = normalizeModule(await api<any>(`/modules/${id}`))
  freshModuleIds.add(id)
  setState((s) => ({ ...s, modules: [full, ...s.modules.filter((m) => m.id !== id)] }))
  return full
}

/**
 * Full module (audio script + visual summary). Answers from the cache when it has the full module, so pages open
 * instantly and offline; an old cached copy is then refreshed in the background, and the update shows up in the
 * store (the next time the module opens, at the latest).
 */
export async function fetchModuleById(id: string): Promise<LearningModule | null> {
  const cached = getSnapshot().modules.find((m) => m.id === id)
  if (isFull(cached)) {
    if (!freshModuleIds.has(id)) {
      freshModuleIds.add(id)
      loadFullModule(id).catch(() => freshModuleIds.delete(id))
    }
    return cached!
  }
  try {
    return await loadFullModule(id)
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 422) return null
    throw networkError(err)
  }
}

/* ------------------------------------------------------------------ */
/* Exams (teacher)                                                    */
/* ------------------------------------------------------------------ */
export async function createExam(input: { title: string; moduleId: string | null; questions: Question[] }) {
  try {
    const res = await api<any>('/exams', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        moduleId: input.moduleId || undefined,
        questions: input.questions.map((q) => ({
          question: q.text || q.question || '',
          options: q.options,
          correctAnswer: q.answer || q.correctAnswer || 'A',
        })),
      }),
    })
    const exam = { ...normalizeExam(res), submissionCount: 0, averageScore: null }
    setState((s) => ({ ...s, exams: [exam, ...s.exams.filter((e) => e.id !== exam.id)] }))
    return exam
  } catch (err) {
    throw networkError(err)
  }
}

/** Reopening fails with 409 PIN_CONFLICT when another active exam has taken the PIN; the error is shown as is. */
export async function setExamStatus(id: string, status: Exam['status']) {
  try {
    await api(`/exams/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive: status === 'active' }) })
  } catch (err) {
    throw networkError(err)
  }
  setState((st) => ({
    ...st,
    exams: st.exams.map((e) => (e.id === id ? { ...e, status, isActive: status === 'active' } : e)),
  }))
}

/** All submissions of one exam (every page), replacing what the store had for that exam. */
export async function loadExamSubmissions(examId: string) {
  const all: Submission[] = []
  for (let page = 1; ; page++) {
    const res = await api<{ items: any[]; total: number }>(
      `/submissions?examId=${encodeURIComponent(examId)}&pageSize=${PAGE_SIZE}&page=${page}`,
    ).catch((err) => {
      throw networkError(err)
    })
    all.push(...(res.items ?? []).map(normalizeSubmission))
    if (!res.items?.length || all.length >= res.total) break
  }
  setState((s) => ({ ...s, submissions: [...all, ...s.submissions.filter((x) => x.examId !== examId)] }))
  return all
}

/** Count and average from the server's exam list; falls back to loaded submissions for a just-created exam. */
export function examStats(examId: string, submissions: Submission[]) {
  const exam = getSnapshot().exams.find((e) => e.id === examId)
  const list = submissions.filter((s) => s.examId === examId)
  if (exam?.submissionCount !== undefined && exam.submissionCount >= list.length) {
    return { count: exam.submissionCount, averageScore: exam.averageScore ?? null }
  }
  if (list.length === 0) return { count: 0, averageScore: null }
  return { count: list.length, averageScore: Math.round(list.reduce((a, b) => a + b.score, 0) / list.length) }
}

/* ------------------------------------------------------------------ */
/* Exams (student)                                                    */
/* ------------------------------------------------------------------ */
export async function getExamByPin(pin: string): Promise<Exam> {
  try {
    const res = await api<any>(`/exams/${pin}`)
    return {
      id: res.id,
      title: res.title,
      pin,
      status: 'active',
      isActive: true,
      moduleId: null,
      // The server never sends the answer key to students; scoring happens on submit.
      questions: (res.questions || []).map((q: any) => ({ id: q.id, text: q.question, question: q.question, options: q.options, answer: 'A' })),
      createdAt: new Date().toISOString(),
    }
  } catch (err: any) {
    if (err?.code === 'EXAM_CLOSED') throw new ApiError('EXAM_CLOSED', 'Ujian sudah ditutup oleh guru.')
    if (err?.code === 'PIN_NOT_FOUND' || err?.status === 404) {
      throw new ApiError('PIN_NOT_FOUND', 'PIN tidak ditemukan atau ujian sudah ditutup.')
    }
    throw networkError(err, 'Tidak bisa memuat ujian. Periksa koneksi lalu coba lagi.')
  }
}

/**
 * Scored on the server only. On a network error the attempt (answers + attemptId) stays on the device and
 * `retry()` resends it; the server is idempotent per attemptId, so a retry never counts twice.
 */
export async function submitExam(input: {
  pin: string
  attemptId: string
  studentName: string
  answers: Record<number, Letter | null>
}) {
  try {
    const res = await api<any>(`/exams/${input.pin}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        attemptId: input.attemptId,
        studentName: input.studentName,
        answers: Object.entries(input.answers)
          .filter(([, ans]) => ans)
          .map(([qid, ans]) => ({ questionId: Number(qid), answer: ans })),
      }),
    })
    const submission: Submission = {
      id: res.submissionId,
      examId: '',
      attemptId: input.attemptId,
      studentName: res.studentName,
      answers: input.answers,
      correctCount: res.correctCount,
      totalQuestions: res.totalQuestions,
      answeredCount: res.answeredCount,
      score: res.score,
      createdAt: toIso(res.submittedAt),
    }
    return { submission }
  } catch (err: any) {
    if (err?.code === 'EXAM_CLOSED') throw new ApiError('EXAM_CLOSED', 'Ujian sudah ditutup oleh guru.')
    if (err?.code === 'PIN_NOT_FOUND' || err?.status === 404) throw new ApiError('PIN_NOT_FOUND', 'PIN ujian tidak ditemukan.')
    throw networkError(err, 'Jawaban belum terkirim karena koneksi terputus. Jawaban Anda aman, coba kirim lagi.')
  }
}
