'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookX, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/guru/guru-shell'
import { Alert, EmptyState, Field, Skeleton, btnLime, btnSecondary, inputClass } from '@/components/site/form'
import { fetchModuleById, updateModule, useStore } from '@/lib/store'
import type { LearningModule, VisualSummary } from '@/lib/types'

/** Same limits as the API (backend/utils/model.ts DeafVisualSummary, learning-modules/model.ts). */
const MAX = {
  title: 200,
  rawContent: 100_000,
  audioScript: 50_000,
  summary: 1000,
  sections: 12,
  heading: 200,
  points: 10,
  point: 500,
  central: 200,
  branches: 12,
  label: 200,
  children: 10,
  child: 300,
  glossary: 30,
  term: 200,
  definition: 1000,
}

let lastKey = 0
const newKey = () => ++lastKey

/** Lists are edited as text, one item per line, so a teacher can paste and reorder freely. */
type Draft = {
  title: string
  rawContent: string
  blindAudioScript: string
  summary: string
  sections: { key: number; heading: string; points: string }[]
  central: string
  branches: { key: number; label: string; children: string }[]
  glossary: { key: number; term: string; definition: string }[]
}

const emptySection = () => ({ key: newKey(), heading: '', points: '' })
const emptyBranch = () => ({ key: newKey(), label: '', children: '' })
const emptyTerm = () => ({ key: newKey(), term: '', definition: '' })

function toDraft(m: LearningModule): Draft {
  const v = m.deafVisualSummary
  const sections = (v?.sections ?? []).map((s) => ({
    key: newKey(),
    heading: s.heading || s.title || '',
    points: (s.points ?? []).join('\n'),
  }))
  const branches = (v?.conceptMap?.branches ?? []).map((b) =>
    typeof b === 'string'
      ? { key: newKey(), label: b, children: '' }
      : { key: newKey(), label: b.label, children: (b.children ?? []).join('\n') },
  )
  return {
    title: m.title,
    rawContent: m.rawContent || m.originalText || '',
    blindAudioScript: m.blindAudioScript,
    summary: v?.summary ?? '',
    sections: sections.length ? sections : [emptySection()],
    central: v?.conceptMap?.central || v?.conceptMap?.center || '',
    branches: branches.length ? branches : [emptyBranch()],
    glossary: (v?.glossary ?? []).map((g) => ({ key: newKey(), term: g.term, definition: g.definition || g.meaning || '' })),
  }
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

type Payload = Pick<LearningModule, 'title' | 'rawContent' | 'blindAudioScript' | 'deafVisualSummary'>
type Checked = { ok: true; value: Payload } | { ok: false; message: string; field: string }

/** Trims everything, drops empty rows, and checks what the API would reject, with a message per field. */
function check(d: Draft): Checked {
  const fail = (message: string, field: string): Checked => ({ ok: false, message, field })
  const title = d.title.trim()
  if (!title) return fail('Judul modul wajib diisi.', 'ubah-judul')
  const rawContent = d.rawContent.trim()
  if (!rawContent) return fail('Materi asli tidak boleh kosong.', 'ubah-materi')
  const blindAudioScript = d.blindAudioScript.trim()
  if (!blindAudioScript) return fail('Naskah audio tidak boleh kosong.', 'ubah-naskah')
  const summary = d.summary.trim()
  if (!summary) return fail('Inti materi wajib diisi.', 'ubah-inti')

  const sections: VisualSummary['sections'] = []
  for (const [i, s] of d.sections.entries()) {
    const heading = s.heading.trim()
    const points = lines(s.points)
    if (!heading && points.length === 0) continue
    const at = `Bagian ${i + 1}`
    if (!heading) return fail(`${at}: judul bagian wajib diisi.`, `bagian-${s.key}-judul`)
    if (points.length === 0) return fail(`${at}: isi minimal satu poin.`, `bagian-${s.key}-poin`)
    if (points.length > MAX.points) return fail(`${at}: maksimal ${MAX.points} poin.`, `bagian-${s.key}-poin`)
    if (points.some((p) => p.length > MAX.point)) {
      return fail(`${at}: satu poin maksimal ${MAX.point} karakter.`, `bagian-${s.key}-poin`)
    }
    sections.push({ heading, points })
  }
  if (sections.length === 0) return fail('Isi minimal satu bagian ringkasan.', `bagian-${d.sections[0]?.key}-judul`)

  const central = d.central.trim()
  if (!central) return fail('Konsep utama peta konsep wajib diisi.', 'ubah-konsep')
  const branches: { label: string; children: string[] }[] = []
  for (const [i, b] of d.branches.entries()) {
    const label = b.label.trim()
    const children = lines(b.children)
    if (!label && children.length === 0) continue
    const at = `Cabang ${i + 1}`
    if (!label) return fail(`${at}: nama sub-konsep wajib diisi.`, `cabang-${b.key}-nama`)
    if (children.length > MAX.children) return fail(`${at}: maksimal ${MAX.children} rincian.`, `cabang-${b.key}-rincian`)
    if (children.some((c) => c.length > MAX.child)) {
      return fail(`${at}: satu rincian maksimal ${MAX.child} karakter.`, `cabang-${b.key}-rincian`)
    }
    branches.push({ label, children })
  }
  if (branches.length === 0) return fail('Isi minimal satu cabang peta konsep.', `cabang-${d.branches[0]?.key}-nama`)

  const glossary: { term: string; definition: string }[] = []
  for (const [i, g] of d.glossary.entries()) {
    const term = g.term.trim()
    const definition = g.definition.trim()
    if (!term && !definition) continue
    if (!term) return fail(`Istilah ${i + 1}: istilah wajib diisi.`, `istilah-${g.key}-istilah`)
    if (!definition) return fail(`Istilah ${i + 1}: arti istilah wajib diisi.`, `istilah-${g.key}-arti`)
    glossary.push({ term, definition })
  }

  return {
    ok: true,
    value: {
      title,
      rawContent,
      blindAudioScript,
      deafVisualSummary: { summary, sections, conceptMap: { central, branches }, glossary },
    },
  }
}

export function ModuleEditor({ id }: { id: string }) {
  const router = useRouter()
  const mod = useStore((s) => s.modules.find((m) => m.id === id))
  const [loading, setLoading] = useState(!mod || !mod.blindAudioScript)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(() => (mod?.blindAudioScript ? toDraft(mod) : null))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mod || !mod.blindAudioScript) {
      setLoading(true)
      setFailed(false)
      fetchModuleById(id)
        .catch(() => setFailed(true))
        .finally(() => setLoading(false))
    }
  }, [id, mod, attempt])

  // Start from the saved module once; later store updates must not overwrite what the teacher is typing.
  useEffect(() => {
    if (mod?.blindAudioScript && !draft) setDraft(toDraft(mod))
  }, [mod, draft])

  // Closing or reloading the tab with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Also while the loaded module is being turned into a draft (one render), so "not found" never flashes.
  if (!draft && (loading || mod?.blindAudioScript)) return <Skeleton className="h-96" />

  if (!draft) {
    return (
      <EmptyState
        icon={BookX}
        text={failed ? 'Tidak bisa memuat modul. Periksa koneksi lalu coba lagi.' : 'Modul tidak ditemukan.'}
        action={
          failed ? (
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className={btnLime}>
              Coba lagi
            </button>
          ) : (
            <Link href="/guru/modul" className={btnLime}>
              Kembali ke daftar modul
            </Link>
          )
        }
      />
    )
  }

  function edit(update: (d: Draft) => Draft) {
    setDraft((d) => (d ? update(d) : d))
    setDirty(true)
  }

  function showError(message: string, field?: string) {
    setError(message)
    // The alert announces the problem; focus moves to the field that needs fixing.
    requestAnimationFrame(() => {
      const target = field ? document.getElementById(field) : null
      ;(target ?? alertRef.current)?.focus()
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    const result = check(draft)
    if (!result.ok) return showError(result.message, result.field)
    setSaving(true)
    setError('')
    try {
      await updateModule(id, result.value)
      setDirty(false)
      router.push(`/guru/modul/${id}?disimpan=1`)
    } catch (err: any) {
      setSaving(false)
      showError(
        err?.status === 404
          ? 'Modul ini tidak ditemukan atau bukan milik Anda, jadi tidak bisa diedit.'
          : err instanceof Error
            ? err.message
            : 'Gagal menyimpan perubahan.',
      )
    }
  }

  function cancel(e: React.MouseEvent) {
    if (dirty && !window.confirm('Buang perubahan yang belum disimpan?')) e.preventDefault()
  }

  const setSection = (key: number, patch: Partial<Draft['sections'][number]>) =>
    edit((d) => ({ ...d, sections: d.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))
  const setBranch = (key: number, patch: Partial<Draft['branches'][number]>) =>
    edit((d) => ({ ...d, branches: d.branches.map((b) => (b.key === key ? { ...b, ...patch } : b)) }))
  const setTerm = (key: number, patch: Partial<Draft['glossary'][number]>) =>
    edit((d) => ({ ...d, glossary: d.glossary.map((g) => (g.key === key ? { ...g, ...patch } : g)) }))

  const card = 'flex flex-col gap-5 rounded-3xl border border-border bg-white p-6 md:p-8'
  const cardTitle = 'text-lg font-black'
  const removeBtn =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40'

  return (
    <form onSubmit={save} data-state={saving ? 'saving' : 'editing'} aria-busy={saving} className="flex flex-col gap-8">
      <div>
        <Link
          href={`/guru/modul/${id}`}
          onClick={cancel}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Kembali ke modul
        </Link>
        <PageHeader
          title="Edit modul"
          description="Ubah judul, naskah audio, dan ringkasan visual. Siswa melihat versi baru setelah Anda menyimpan."
        />
      </div>

      {error && (
        <Alert ref={alertRef} title="Belum bisa disimpan">
          {error}
        </Alert>
      )}

      <section aria-labelledby="ubah-dasar" className={card}>
        <h2 id="ubah-dasar" className={cardTitle}>
          Judul &amp; materi asli
        </h2>
        <Field id="ubah-judul" label="Judul modul">
          <input
            id="ubah-judul"
            value={draft.title}
            maxLength={MAX.title}
            onChange={(e) => edit((d) => ({ ...d, title: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field
          id="ubah-materi"
          label="Materi asli"
          hint="Mengubah materi asli tidak membuat ulang naskah audio dan ringkasan. Ubah keduanya di bawah bila perlu."
        >
          <textarea
            id="ubah-materi"
            rows={8}
            value={draft.rawContent}
            maxLength={MAX.rawContent}
            onChange={(e) => edit((d) => ({ ...d, rawContent: e.target.value }))}
            aria-describedby="ubah-materi-hint"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </section>

      <section aria-labelledby="ubah-audio" className={card}>
        <h2 id="ubah-audio" className={cardTitle}>
          Naskah audio (tunanetra)
        </h2>
        <Field
          id="ubah-naskah"
          label="Naskah yang dibacakan mesin suara"
          hint={`${draft.blindAudioScript.trim().length.toLocaleString('id-ID')} karakter · pisahkan paragraf dengan satu baris kosong · hindari simbol dan tabel`}
        >
          <textarea
            id="ubah-naskah"
            rows={14}
            value={draft.blindAudioScript}
            maxLength={MAX.audioScript}
            onChange={(e) => edit((d) => ({ ...d, blindAudioScript: e.target.value }))}
            aria-describedby="ubah-naskah-hint"
            className={`${inputClass} resize-y font-mono text-sm leading-relaxed`}
          />
        </Field>
      </section>

      <section aria-labelledby="ubah-visual" className={card}>
        <h2 id="ubah-visual" className={cardTitle}>
          Ringkasan visual (tunarungu)
        </h2>
        <Field id="ubah-inti" label="Inti materi" hint="1–2 kalimat pendek dan lugas.">
          <textarea
            id="ubah-inti"
            rows={3}
            value={draft.summary}
            maxLength={MAX.summary}
            onChange={(e) => edit((d) => ({ ...d, summary: e.target.value }))}
            aria-describedby="ubah-inti-hint"
            className={`${inputClass} resize-y`}
          />
        </Field>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Bagian &amp; poin
          </legend>
          {draft.sections.map((s, i) => (
            <div key={s.key} className="flex flex-col gap-3 rounded-2xl border-2 border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">Bagian {i + 1}</span>
                <button
                  type="button"
                  onClick={() => edit((d) => ({ ...d, sections: d.sections.filter((x) => x.key !== s.key) }))}
                  className={removeBtn}
                  aria-label={`Hapus bagian ${i + 1}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Hapus
                </button>
              </div>
              <Field id={`bagian-${s.key}-judul`} label="Judul bagian">
                <input
                  id={`bagian-${s.key}-judul`}
                  value={s.heading}
                  maxLength={MAX.heading}
                  onChange={(e) => setSection(s.key, { heading: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field
                id={`bagian-${s.key}-poin`}
                label="Poin"
                hint={`Satu poin per baris, maksimal ${MAX.points} poin.`}
              >
                <textarea
                  id={`bagian-${s.key}-poin`}
                  rows={4}
                  value={s.points}
                  onChange={(e) => setSection(s.key, { points: e.target.value })}
                  aria-describedby={`bagian-${s.key}-poin-hint`}
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => edit((d) => ({ ...d, sections: [...d.sections, emptySection()] }))}
            disabled={draft.sections.length >= MAX.sections}
            className={`${btnSecondary} self-start`}
          >
            <Plus className="size-4" aria-hidden="true" /> Tambah bagian
          </button>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Peta konsep
          </legend>
          <Field id="ubah-konsep" label="Konsep utama">
            <input
              id="ubah-konsep"
              value={draft.central}
              maxLength={MAX.central}
              onChange={(e) => edit((d) => ({ ...d, central: e.target.value }))}
              className={inputClass}
            />
          </Field>
          {draft.branches.map((b, i) => (
            <div key={b.key} className="flex flex-col gap-3 rounded-2xl border-2 border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">Cabang {i + 1}</span>
                <button
                  type="button"
                  onClick={() => edit((d) => ({ ...d, branches: d.branches.filter((x) => x.key !== b.key) }))}
                  className={removeBtn}
                  aria-label={`Hapus cabang ${i + 1}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" /> Hapus
                </button>
              </div>
              <Field id={`cabang-${b.key}-nama`} label="Sub-konsep">
                <input
                  id={`cabang-${b.key}-nama`}
                  value={b.label}
                  maxLength={MAX.label}
                  onChange={(e) => setBranch(b.key, { label: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field
                id={`cabang-${b.key}-rincian`}
                label="Rincian (opsional)"
                hint={`Satu rincian per baris, maksimal ${MAX.children}.`}
              >
                <textarea
                  id={`cabang-${b.key}-rincian`}
                  rows={3}
                  value={b.children}
                  onChange={(e) => setBranch(b.key, { children: e.target.value })}
                  aria-describedby={`cabang-${b.key}-rincian-hint`}
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </Field>
            </div>
          ))}
          <button
            type="button"
            onClick={() => edit((d) => ({ ...d, branches: [...d.branches, emptyBranch()] }))}
            disabled={draft.branches.length >= MAX.branches}
            className={`${btnSecondary} self-start`}
          >
            <Plus className="size-4" aria-hidden="true" /> Tambah cabang
          </button>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">Glosarium</legend>
          {draft.glossary.length === 0 && <p className="text-sm text-muted-foreground">Belum ada istilah.</p>}
          {draft.glossary.map((g, i) => (
            <div key={g.key} className="grid gap-3 rounded-2xl border-2 border-border p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <Field id={`istilah-${g.key}-istilah`} label={`Istilah ${i + 1}`}>
                <input
                  id={`istilah-${g.key}-istilah`}
                  value={g.term}
                  maxLength={MAX.term}
                  onChange={(e) => setTerm(g.key, { term: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field id={`istilah-${g.key}-arti`} label="Arti">
                <input
                  id={`istilah-${g.key}-arti`}
                  value={g.definition}
                  maxLength={MAX.definition}
                  onChange={(e) => setTerm(g.key, { definition: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <button
                type="button"
                onClick={() => edit((d) => ({ ...d, glossary: d.glossary.filter((x) => x.key !== g.key) }))}
                className={`${removeBtn} min-h-12 justify-center`}
                aria-label={`Hapus istilah ${i + 1}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Hapus
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => edit((d) => ({ ...d, glossary: [...d.glossary, emptyTerm()] }))}
            disabled={draft.glossary.length >= MAX.glossary}
            className={`${btnSecondary} self-start`}
          >
            <Plus className="size-4" aria-hidden="true" /> Tambah istilah
          </button>
        </fieldset>
      </section>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" role="status">
          {saving ? 'Menyimpan perubahan…' : dirty ? 'Ada perubahan yang belum disimpan.' : 'Belum ada perubahan.'}
        </p>
        <div className="flex gap-3">
          <Link href={`/guru/modul/${id}`} onClick={cancel} className={btnSecondary}>
            Batal
          </Link>
          <button type="submit" disabled={saving || !dirty} className={btnLime}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {saving ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        </div>
      </div>
    </form>
  )
}
