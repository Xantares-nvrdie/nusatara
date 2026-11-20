import { LETTERS, type Letter } from './types'

/**
 * Turns what id-ID speech recognition wrote into exam actions. Google often writes a spoken letter as a word
 * ("be", "ce", "de") or glues it to the command, so matching works on normalized words, not raw characters.
 */

/** Lowercase words without punctuation: "Jawab, B." -> ["jawab", "b"]. */
export function toWords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

const LETTER_WORDS = new Map<string, Letter>([
  ['a', 'A'],
  ['b', 'B'],
  ['be', 'B'],
  ['c', 'C'],
  ['ce', 'C'],
  ['d', 'D'],
  ['de', 'D'],
])
const ANSWER_KEYWORDS = new Set(['jawab', 'jawaban', 'jawabannya', 'pilih', 'pilihan', 'opsi'])
const ORDINALS: [string, Letter][] = [
  ['pertama', 'A'],
  ['kedua', 'B'],
  ['ketiga', 'C'],
  ['keempat', 'D'],
]

/**
 * The answer letter in "Jawab B", "jawaban be", "pilih C", a lone "D", "yang kedua", or the option's own text
 * ("daun"). Null when nothing (or more than one option) matches, so a guess never becomes an answer.
 */
export function parseAnswer(transcript: string, options?: Partial<Record<Letter, string>>): Letter | null {
  const words = toWords(transcript)
  for (let i = 0; i < words.length - 1; i++) {
    if (ANSWER_KEYWORDS.has(words[i])) {
      const letter = LETTER_WORDS.get(words[i + 1])
      if (letter) return letter
    }
  }
  const letters = [...new Set(words.map((w) => LETTER_WORDS.get(w)).filter((l): l is Letter => Boolean(l)))]
  if (letters.length === 1) return letters[0]

  const ordinal = ORDINALS.find(([word]) => words.includes(word))
  if (ordinal) return ordinal[1]

  if (options) {
    const said = ` ${words.join(' ')} `
    const hits = LETTERS.filter((l) => {
      const opt = toWords(options[l] ?? '').join(' ')
      return opt.length > 0 && said.includes(` ${opt} `)
    })
    if (hits.length === 1) return hits[0]
  }
  return null
}

const DIGIT_WORDS: Record<string, string> = {
  nol: '0',
  kosong: '0',
  satu: '1',
  dua: '2',
  tiga: '3',
  empat: '4',
  lima: '5',
  enam: '6',
  tujuh: '7',
  delapan: '8',
  sembilan: '9',
}

/** "satu dua tiga empat", "12 34" or "1234" -> "1234". */
export function parseDigits(transcript: string) {
  return toWords(transcript)
    .map((w) => DIGIT_WORDS[w] ?? w.replace(/\D/g, ''))
    .join('')
}

/** "Nama saya Budi Santoso" -> "Budi Santoso". */
export function parseName(transcript: string) {
  return transcript
    .trim()
    .replace(/^(nama\s+saya|saya|namaku|nama)\s+/i, '')
    .replace(/[.!?]+$/, '')
    .trim()
}

const has = (text: string, ...keys: string[]) => {
  const words = toWords(text)
  return keys.some((k) => (k.includes(' ') ? words.join(' ').includes(k) : words.includes(k)))
}

const HEDGE_WORDS = new Set(['apa', 'gimana', 'bagaimana', 'mana', 'kenapa', 'mungkin', 'kayaknya', 'sepertinya', 'entah'])

export const command = {
  finish: (t: string) => has(t, 'selesai', 'akhiri'),
  repeat: (t: string) => has(t, 'ulangi', 'ulang'),
  next: (t: string) => has(t, 'lanjut', 'berikut', 'berikutnya', 'selanjutnya'),
  prev: (t: string) => has(t, 'kembali', 'sebelum', 'sebelumnya', 'mundur'),
  send: (t: string) => has(t, 'kirim', 'selesai', 'ya'),
  review: (t: string) => has(t, 'periksa', 'cek', 'kembali'),
  retry: (t: string) => has(t, 'coba lagi', 'coba', 'ulangi', 'kirim'),
  /**
   * A clear yes to "Apakah Anda yakin?". "Apa ya…" or "mungkin ya" is thinking aloud, and a long sentence that
   * merely contains "ya" is unclear; both get asked again instead of saving. Check `no` first: "tidak yakin".
   */
  yes: (t: string) => {
    const words = toWords(t)
    if (words.some((w) => HEDGE_WORDS.has(w))) return false
    if (words.includes('yakin')) return true
    return words.length <= 3 && has(t, 'ya', 'iya', 'benar', 'betul', 'oke', 'ok', 'setuju')
  },
  no: (t: string) =>
    has(t, 'tidak', 'enggak', 'nggak', 'gak', 'ndak', 'bukan', 'batal', 'ganti', 'salah', 'jangan', 'pilih ulang'),
}
