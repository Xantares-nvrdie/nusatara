/**
 * An audio script (blindAudioScript) split for playback. The AI writes it as short paragraphs separated by a blank
 * line (learning-modules/converter.ts); each paragraph is one part a student can jump to, and each sentence is one
 * utterance, so the caption follows what is really being read.
 */
export type ScriptPart = {
  /** The whole paragraph, on one line. */
  text: string
  /** Index of the paragraph's first and last sentence in `sentences`. */
  first: number
  last: number
}

export type ScriptSentence = { text: string; part: number }

export function splitScript(script: string): { parts: ScriptPart[]; sentences: ScriptSentence[] } {
  const sentences: ScriptSentence[] = []
  const parts: ScriptPart[] = []
  const paragraphs = script
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  for (const paragraph of paragraphs) {
    const first = sentences.length
    for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
      const text = sentence.trim()
      if (text) sentences.push({ text, part: parts.length })
    }
    parts.push({ text: paragraph, first, last: sentences.length - 1 })
  }
  return { parts, sentences }
}
