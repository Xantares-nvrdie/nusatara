import type { LearningModule } from './types'

export type ConceptMapNode = { label: string; children: string[] }
export type GlossaryEntry = { term: string; definition: string }

/** What one lesson shows. Every value comes from the module's deafVisualSummary. */
export type ModuleLessonContent =
  | { kind: 'summary'; text: string }
  | { kind: 'points'; points: string[] }
  | { kind: 'concept-map'; center: string; branches: ConceptMapNode[] }
  | { kind: 'glossary'; entries: GlossaryEntry[] }

export type ModuleLesson = {
  /** Stable id: `ringkasan`, `bagian-<n>` (n = position of the section in the module), `peta-konsep`, `istilah`. */
  id: string
  /** `<chapter>.<lesson>`, e.g. `2.1`. */
  number: string
  title: string
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  content: ModuleLessonContent
}

export type ModuleChapter = {
  id: string
  number: number
  title: string
  lessons: ModuleLesson[]
}

type LessonDraft = Pick<ModuleLesson, 'id' | 'title' | 'content'>

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const textList = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : [])

/**
 * Ordered chapter/lesson outline of a module, built only from its visual summary:
 * Ringkasan (summary), Materi (one lesson per section with points), Peta konsep & istilah
 * (concept map if it has branches, glossary if it has terms). Chapters without lessons are left out
 * and the rest are numbered in order. Accepts both summary shapes (heading/title, central/center,
 * string/object branches, definition/meaning).
 */
export function buildModuleLessons(mod: Pick<LearningModule, 'title' | 'deafVisualSummary'>): ModuleChapter[] {
  const visual = mod.deafVisualSummary
  if (!visual) return []

  const summary = text(visual.summary)

  const sections = (Array.isArray(visual.sections) ? visual.sections : []).flatMap((section, i): LessonDraft[] => {
    const points = textList(section?.points)
    if (points.length === 0) return []
    const n = i + 1
    return [
      {
        id: `bagian-${n}`,
        title: text(section.heading) || text(section.title) || `Bagian ${n}`,
        content: { kind: 'points', points },
      },
    ]
  })

  const map = visual.conceptMap
  const branches = (Array.isArray(map?.branches) ? map.branches : []).flatMap((branch): ConceptMapNode[] => {
    const label = typeof branch === 'string' ? text(branch) : text(branch?.label)
    if (!label) return []
    return [{ label, children: typeof branch === 'string' ? [] : textList(branch.children) }]
  })
  const center = text(map?.central) || text(map?.center) || text(mod.title)

  const glossary = (Array.isArray(visual.glossary) ? visual.glossary : []).flatMap((entry): GlossaryEntry[] => {
    const term = text(entry?.term)
    return term ? [{ term, definition: text(entry.definition) || text(entry.meaning) }] : []
  })

  const overview: LessonDraft[] = []
  if (summary) overview.push({ id: 'ringkasan', title: 'Inti materi', content: { kind: 'summary', text: summary } })

  const extras: LessonDraft[] = []
  if (branches.length > 0) {
    extras.push({ id: 'peta-konsep', title: 'Peta konsep', content: { kind: 'concept-map', center, branches } })
  }
  if (glossary.length > 0) {
    extras.push({ id: 'istilah', title: 'Istilah penting', content: { kind: 'glossary', entries: glossary } })
  }

  const drafts: { id: string; title: string; lessons: LessonDraft[] }[] = [
    { id: 'bab-ringkasan', title: 'Ringkasan', lessons: overview },
    { id: 'bab-materi', title: 'Materi', lessons: sections },
    { id: 'bab-peta-konsep-istilah', title: 'Peta konsep & istilah', lessons: extras },
  ]

  return drafts
    .filter((chapter) => chapter.lessons.length > 0)
    .map((chapter, ci) => {
      const chapterNumber = ci + 1
      return {
        id: chapter.id,
        number: chapterNumber,
        title: chapter.title,
        lessons: chapter.lessons.map((lesson, li) => ({
          ...lesson,
          number: `${chapterNumber}.${li + 1}`,
          chapterId: chapter.id,
          chapterNumber,
          chapterTitle: chapter.title,
        })),
      }
    })
}
