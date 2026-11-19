'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Edit3, FileUp, Loader2, Plus, RotateCw, Save, Trash2, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/guru/guru-shell'
import { Alert, Field, btnLime, btnPrimary, btnSecondary, inputClass } from '@/components/site/form'
import { VisualSummaryView } from '@/components/module/visual-summary'
import { createExam, createModule } from '@/lib/store'
import { LETTERS, type Letter, type ConvertResult, type Question } from '@/lib/types'

const DRAFT_KEY = 'draft:konversi'

export function ConvertForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<'idle' | 'converting' | 'preview' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [withExam, setWithExam] = useState(true)
  const alertRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLHeadingElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as { title: string; text: string }
        setTitle(d.title || '')
        setText(d.text || '')
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, text }))
  }, [title, text])

  useEffect(() => {
    if (state === 'error') alertRef.current?.focus()
    if (state === 'preview') previewRef.current?.focus()
  }, [state])

  async function convert(e: React.FormEvent) {
    e.preventDefault()

    if (!file && (!title.trim() || text.trim().length < 80)) {
      setError('Judul wajib diisi dan materi minimal 80 karakter (atau unggah file PDF/TXT).')
      setState('error')
      return
    }

    setState('converting')
    try {
      let res: Response
      if (file) {
        const formData = new FormData()
        if (title.trim()) formData.append('title', title.trim())
        formData.append('file', file)
        formData.append('questionCount', '5')

        res = await fetch('/api/modules/convert', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Try backend /api/modules/convert first
        res = await fetch('/api/modules/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: text.trim(),
            questionCount: 5,
          }),
        })

        // If not found (e.g. legacy endpoint), try /api/konversi
        if (res.status === 404) {
          res = await fetch('/api/konversi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, text }),
          })
        }
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Konversi gagal.')

      if (data.title && !title) setTitle(data.title)
      if (data.rawContent && !text) setText(data.rawContent)

      const questions: Question[] = (data.questions || []).map((q: any, i: number) => ({
        id: q.id ?? i + 1,
        text: q.question ?? q.text,
        options: q.options,
        answer: q.correctAnswer ?? q.answer,
      }))

      setResult({
        title: data.title || title,
        rawContent: data.rawContent || text,
        blindAudioScript: data.blindAudioScript,
        deafVisualSummary: data.deafVisualSummary,
        questions,
      })
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung.')
      setState('error')
    }
  }

  function updateAudioScript(val: string) {
    if (!result) return
    setResult({ ...result, blindAudioScript: val })
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    if (!result || !result.questions) return
    const updated = result.questions.map((q, i) => (i === index ? { ...q, ...patch } : q))
    setResult({ ...result, questions: updated })
  }

  function addQuestion() {
    if (!result) return
    const current = result.questions || []
    const newQ: Question = {
      id: current.length + 1,
      text: '',
      options: { A: '', B: '', C: '', D: '' },
      answer: 'A',
    }
    setResult({ ...result, questions: [...current, newQ] })
  }

  function deleteQuestion(index: number) {
    if (!result || !result.questions) return
    const updated = result.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, id: i + 1 }))
    setResult({ ...result, questions: updated })
  }

  async function save() {
    if (!result) return
    setState('saving')
    try {
      const finalTitle = title.trim() || result.title || 'Materi Pembelajaran'
      const finalContent = text.trim() || result.rawContent || ''

      const mod = await createModule({
        title: finalTitle,
        originalText: finalContent,
        blindAudioScript: result.blindAudioScript,
        deafVisualSummary: result.deafVisualSummary,
      })

      if (withExam && result.questions && result.questions.length) {
        await createExam({
          title: `Ujian: ${mod.title}`,
          moduleId: mod.id,
          questions: result.questions,
        })
      }

      sessionStorage.removeItem(DRAFT_KEY)
      router.push(`/guru/modul/${mod.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
      setState('error')
    }
  }

  const busy = state === 'converting' || state === 'saving'

  return (
    <div data-state={state}>
      <PageHeader
        title="Konversi materi"
        description="Tempel teks pelajaran atau unggah file PDF/TXT. AI membuat naskah audio, ringkasan visual, dan soal."
      />

      <form onSubmit={convert} className="flex flex-col gap-5 rounded-3xl border border-border bg-white p-6 md:p-8" aria-busy={busy}>
        {state === 'error' && <Alert ref={alertRef} title="Tidak bisa melanjutkan">{error}</Alert>}

        <Field id="judul" label="Judul modul (opsional bila unggah file)">
          <input
            id="judul"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            className={inputClass}
            placeholder="Contoh: Siklus Air"
          />
        </Field>

        <Field id="materi" label="Teks materi" hint={`${text.trim().length} karakter · minimal 80`}>
          <textarea
            id="materi"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (file) setFile(null)
            }}
            disabled={busy || !!file}
            rows={10}
            className={`${inputClass} resize-y leading-relaxed`}
            placeholder="Tempel materi pelajaran di sini atau unggah file di bawah…"
            aria-describedby="materi-hint"
          />
        </Field>

        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-4">
          <label className="text-sm font-bold text-foreground">Atau unggah file dokumen (PDF atau TXT, maks. 4MB):</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.md"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setFile(f)
                  if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
                }
              }}
              className="text-sm file:mr-4 file:rounded-full file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-muted/80"
            />
            {file && (
              <button
                type="button"
                className="text-xs font-bold text-destructive hover:underline"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                Hapus file
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {state === 'converting' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : file ? (
              <FileUp className="size-4" aria-hidden="true" />
            ) : (
              <Wand2 className="size-4" aria-hidden="true" />
            )}
            {state === 'converting' ? 'Mengonversi…' : result ? 'Konversi ulang' : 'Konversi'}
          </button>
        </div>

        <p role="status" className="sr-only">
          {state === 'converting' ? 'Sedang mengonversi materi.' : state === 'preview' ? 'Hasil konversi siap ditinjau.' : ''}
        </p>
      </form>

      {result && state !== 'converting' && (
        <section aria-labelledby="hasil" className="mt-10 flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 id="hasil" ref={previewRef} tabIndex={-1} className="text-2xl font-black">
                Tinjau & Edit Draf Hasil AI
              </h2>
              <p className="text-sm text-muted-foreground">
                Sesuai standar inklusi: guru dapat memeriksa dan mengedit naskah audio, ringkasan visual, dan paket soal sebelum disimpan.
              </p>
            </div>
            <button
              type="button"
              className={btnSecondary}
              onClick={convert}
              disabled={busy}
              title="Minta AI membuat ulang konversi dan soal"
            >
              <RotateCw className="size-4" aria-hidden="true" /> Buat Ulang dengan AI
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="edit-audio-script" className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Edit3 className="size-4" aria-hidden="true" /> Naskah Audio Deskriptif (Tunanetra - Dapat Diedit)
              </label>
              <span className="text-xs text-muted-foreground font-medium">
                {result.blindAudioScript.length} karakter
              </span>
            </div>
            <textarea
              id="edit-audio-script"
              rows={8}
              value={result.blindAudioScript}
              onChange={(e) => updateAudioScript(e.target.value)}
              className={`${inputClass} font-mono text-sm leading-relaxed bg-neutral-50/50 resize-y`}
              placeholder="Naskah audio yang akan dibacakan mesin suara…"
            />
          </div>

          <VisualSummaryView data={result.deafVisualSummary} />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Draf Paket Soal Ujian ({result.questions?.length || 0})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Periksa, edit teks pertanyaan, opsi jawaban, ganti kunci jawaban, atau tambah soal manual.
                </p>
              </div>
              <button
                type="button"
                className={`${btnSecondary} text-xs py-2`}
                onClick={addQuestion}
                disabled={busy}
              >
                <Plus className="size-4" aria-hidden="true" /> Tambah Soal Manual
              </button>
            </div>

            {result.questions && result.questions.length > 0 ? (
              <ol className="flex flex-col gap-5">
                {result.questions.map((q, idx) => (
                  <li key={idx} className="rounded-2xl border-2 border-border bg-white p-5 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <span className="text-sm font-black text-foreground">Soal Nomor {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(idx)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Hapus nomor soal ini"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" /> Hapus
                      </button>
                    </div>

                    <Field id={`draft-q-${idx}`} label="Pertanyaan">
                      <textarea
                        id={`draft-q-${idx}`}
                        rows={2}
                        value={q.text}
                        onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                        className={`${inputClass} text-sm font-semibold`}
                        placeholder="Teks pertanyaan…"
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {LETTERS.map((l) => (
                        <Field key={l} id={`draft-q-${idx}-${l}`} label={`Pilihan ${l}`}>
                          <input
                            id={`draft-q-${idx}-${l}`}
                            value={q.options[l]}
                            onChange={(e) =>
                              updateQuestion(idx, { options: { ...q.options, [l]: e.target.value } })
                            }
                            className={`${inputClass} text-sm`}
                            placeholder={`Pilihan ${l}`}
                          />
                        </Field>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40">
                      <div className="flex items-center gap-3">
                        <label htmlFor={`draft-q-${idx}-ans`} className="text-xs font-bold text-muted-foreground uppercase">
                          Kunci Jawaban Benar:
                        </label>
                        <select
                          id={`draft-q-${idx}-ans`}
                          value={q.answer}
                          onChange={(e) => updateQuestion(idx, { answer: e.target.value as Letter })}
                          className="rounded-lg border-2 border-[#111] bg-lime px-3 py-1 text-xs font-black text-black"
                        >
                          {LETTERS.map((l) => (
                            <option key={l} value={l}>
                              Opsi {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground italic rounded-xl border border-dashed border-border p-4 text-center">
                Belum ada soal ujian. Klik "Tambah Soal Manual" atau "Buat Ulang dengan AI".
              </p>
            )}
          </div>

          <div className="sticky bottom-4 flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between z-20">
            <label className="flex items-center gap-3 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={withExam}
                onChange={(e) => setWithExam(e.target.checked)}
                className="size-5 accent-[#111]"
              />
              <span>Setujui draf &amp; langsung buat sesi ujian dengan PIN 4 digit</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => (setResult(null), setState('idle'))}
                disabled={busy}
              >
                Buang
              </button>
              <button type="button" className={btnLime} onClick={save} disabled={busy}>
                <Save className="size-4" aria-hidden="true" /> {state === 'saving' ? 'Menyimpan…' : 'Simpan Modul'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
