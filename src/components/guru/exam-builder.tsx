'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/guru/guru-shell'
import { Alert, Field, btnLime, btnSecondary, inputClass } from '@/components/site/form'
import { createExam, useStore } from '@/lib/store'
import { LETTERS, type Letter, type Question } from '@/lib/types'

const blank = (id: number): Question => ({ id, text: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A' })

export function ExamBuilder({ moduleId }: { moduleId?: string }) {
  const router = useRouter()
  const modules = useStore((s) => s.modules)
  const preset = modules.find((m) => m.id === moduleId)
  const [title, setTitle] = useState(preset ? `Ujian: ${preset.title}` : '')
  const [modId, setModId] = useState(preset?.id ?? '')
  const [questions, setQuestions] = useState<Question[]>([blank(1)])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const alertRef = useRef<HTMLDivElement>(null)

  function update(i: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const incomplete = questions.findIndex((q) => !q.text.trim() || LETTERS.some((l) => !q.options[l].trim()))
    if (!title.trim()) setError('Judul ujian wajib diisi.')
    else if (incomplete >= 0) setError(`Soal nomor ${incomplete + 1} belum lengkap.`)
    else {
      setSaving(true)
      try {
        await createExam({ title: title.trim(), moduleId: modId || null, questions: questions.map((q, i) => ({ ...q, id: i + 1 })) })
        router.push('/guru/ujian')
        return
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
      } finally {
        setSaving(false)
      }
    }
    requestAnimationFrame(() => alertRef.current?.focus())
  }

  return (
    <div>
      <PageHeader title="Buat ujian" description="PIN 4 digit dibuat otomatis setelah ujian disimpan." />
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        {error && <Alert ref={alertRef} title="Periksa lagi">{error}</Alert>}
        <div className="grid gap-5 rounded-3xl border border-border bg-white p-6 md:grid-cols-2 md:p-8">
          <Field id="judul-ujian" label="Judul ujian">
            <input id="judul-ujian" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field id="modul-ujian" label="Modul terkait (opsional)">
            <select id="modul-ujian" value={modId} onChange={(e) => setModId(e.target.value)} className={inputClass}>
              <option value="">Tanpa modul</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <ol className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <li key={i} className="rounded-3xl border border-border bg-white p-6">
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-2 flex w-full items-center justify-between text-lg font-extrabold">
                  Soal {i + 1}
                </legend>
                <Field id={`q-${i}`} label="Pertanyaan">
                  <textarea id={`q-${i}`} rows={2} value={q.text} onChange={(e) => update(i, { text: e.target.value })} className={inputClass} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LETTERS.map((l) => (
                    <Field key={l} id={`q-${i}-${l}`} label={`Pilihan ${l}`}>
                      <input
                        id={`q-${i}-${l}`}
                        value={q.options[l]}
                        onChange={(e) => update(i, { options: { ...q.options, [l]: e.target.value } })}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <Field id={`q-${i}-ans`} label="Jawaban benar">
                    <select id={`q-${i}-ans`} value={q.answer} onChange={(e) => update(i, { answer: e.target.value as Letter })} className={inputClass}>
                      {LETTERS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </Field>
                  {questions.length > 1 && (
                    <button type="button" className={btnSecondary} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" aria-hidden="true" /> Hapus soal {i + 1}
                    </button>
                  )}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className={btnSecondary} onClick={() => setQuestions((qs) => [...qs, blank(qs.length + 1)])}>
            <Plus className="size-4" aria-hidden="true" /> Tambah soal
          </button>
          <button type="submit" disabled={saving} className={btnLime}>
            {saving ? 'Menyimpan…' : 'Simpan & buat PIN'}
          </button>
        </div>
      </form>
    </div>
  )
}
