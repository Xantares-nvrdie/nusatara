export type Letter = 'A' | 'B' | 'C' | 'D'
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D']

export type ConceptBranch = {
  label: string
  children?: string[]
}

export type VisualSummary = {
  summary: string
  sections: { title?: string; heading?: string; points: string[] }[]
  conceptMap: {
    center?: string
    central?: string
    branches: Array<string | ConceptBranch>
  }
  glossary: { term: string; meaning?: string; definition?: string }[]
}

export type LearningModule = {
  id: string
  title: string
  teacherName: string
  createdAt: string
  /** One-line summary from the module list; the full deafVisualSummary only comes with the module detail. */
  summary?: string
  originalText?: string
  rawContent?: string
  blindAudioScript: string
  deafVisualSummary: VisualSummary
}

export type Question = {
  id: number
  text: string
  question?: string
  options: Record<Letter, string>
  answer: Letter
  correctAnswer?: Letter
}

export type Exam = {
  id: string
  title: string
  pin: string
  moduleId: string | null
  status: 'active' | 'closed'
  isActive?: boolean
  questions: Question[]
  createdAt: string
  /** From the teacher's exam list (GET /exams), which sends counts instead of the questions. */
  questionCount?: number
  submissionCount?: number
  averageScore?: number | null
}

export type Submission = {
  id: string
  examId: string
  attemptId: string
  studentName: string
  answers: Record<number, Letter | null>
  correctCount: number
  totalQuestions: number
  answeredCount: number
  score: number
  createdAt: string
}

export type Teacher = { name: string; email: string }

export type ConvertResult = {
  title?: string
  rawContent?: string
  blindAudioScript: string
  deafVisualSummary: VisualSummary
  questions: Question[]
}
