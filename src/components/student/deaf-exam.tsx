'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, WifiOff } from 'lucide-react'
import { Alert, Field, btnLime, btnPrimary, btnSecondary, inputClass } from '@/components/site/form'
import { LETTERS } from '@/lib/types'
import { useExamAttempt } from '@/lib/use-exam-attempt'
import { cn } from '@/lib/utils'

export function DeafExam() {
  const x = useExamAttempt('tunarungu')
  const [nameInput, setNameInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [fieldError, setFieldError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const q = x.exam?.questions[x.index]
  const total = x.exam?.questions.length ?? 0
  const answered = x.exam ? x.exam.questions.filter((qq) => x.answers[qq.id]).length : 0

  useEffect(() => {
    headingRef.current?.focus()
    setFieldError('')
  }, [x.phase, x.index])

  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-black tracking-tight text-balance md:text-4xl">
      {text}
    </h1>
  )

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8" data-state={x.phase}>
      {x.exam && x.phase !== 'result' && (
        <div>
          <div className="mb-2 flex justify-between text-sm font-bold">
            <span>{x.exam.title}</span>
            <span>
              {answered}/{total} terjawab
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Soal terjawab">
            <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-white p-6 md:p-10">
        {x.phase === 'name' && (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault()
              if (!x.confirmName(nameInput)) setFieldError('Nama wajib diisi.')
            }}
          >
            {heading('Tulis nama Anda')}
            <Field id="nama-siswa" label="Nama lengkap" error={fieldError}>
              <input id="nama-siswa" autoComplete="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} aria-invalid={!!fieldError} className={cn(inputClass, 'text-lg')} />
            </Field>
            <button type="submit" className={`${btnPrimary} self-start`}>
              Lanjut <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {x.phase === 'pin' && (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault()
              x.loadPin(pinInput).then((ok) => !ok && setFieldError('PIN harus 4 angka.'))
            }}
          >
            {heading(`Halo, ${x.name}. Masukkan PIN dari guru.`)}
            <Field id="pin-ujian" label="PIN ujian (4 angka)" error={fieldError}>
              <input
                id="pin-ujian"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                aria-invalid={!!fieldError}
                className={cn(inputClass, 'py-5 text-center font-mono text-4xl font-black tracking-[0.5em]')}
              />
            </Field>
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={() => x.setPhase('name')}>
                Ubah nama
              </button>
              <button type="submit" className={btnLime}>
                Mulai ujian
              </button>
            </div>
          </form>
        )}

        {(x.phase === 'loading' || x.phase === 'submitting') && (
          <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="size-10 animate-spin" aria-hidden="true" />
            {heading(x.phase === 'loading' ? 'Memuat ujian…' : 'Mengirim jawaban…')}
          </div>
        )}

        {x.phase === 'question' && q && (
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full bg-[#111] px-4 py-1.5 text-sm font-bold text-lime">
              Soal {x.index + 1} / {total}
            </span>
            {heading(q.text)}
            <fieldset>
              <legend className="sr-only">Pilih jawaban</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {LETTERS.map((l) => {
                  const active = x.answers[q.id] === l
                  return (
                    <label
                      key={l}
                      className={cn(
                        'flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-lg font-semibold transition-colors has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                        active ? 'border-[#111] bg-lime' : 'border-border hover:border-[#111]',
                      )}
                    >
                      <input type="radio" name={`q-${q.id}`} value={l} checked={active} onChange={() => x.answer(q.id, l)} className="sr-only" />
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-black', active ? 'bg-[#111] text-lime' : 'bg-muted')}>
                        {l}
                      </span>
                      {q.options[l]}
                      {active && <CheckCircle2 className="ml-auto size-6 shrink-0" aria-hidden="true" />}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="flex justify-between gap-3">
              <button type="button" className={btnSecondary} disabled={x.index === 0} onClick={() => x.setIndex(x.index - 1)}>
                <ChevronLeft className="size-4" aria-hidden="true" /> Sebelumnya
              </button>
              <button type="button" className={btnPrimary} onClick={() => (x.index < total - 1 ? x.setIndex(x.index + 1) : x.setPhase('review'))}>
                {x.index < total - 1 ? 'Berikutnya' : 'Periksa jawaban'} <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Lompat ke soal" className="flex flex-wrap gap-2 border-t border-border pt-6">
              {x.exam!.questions.map((qq, i) => (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => x.setIndex(i)}
                  aria-current={i === x.index ? 'step' : undefined}
                  aria-label={`Soal ${i + 1}${x.answers[qq.id] ? ', terjawab' : ', belum dijawab'}`}
                  className={cn(
                    'size-11 rounded-xl text-sm font-black',
                    i === x.index ? 'bg-[#111] text-white' : x.answers[qq.id] ? 'bg-lime' : 'bg-muted',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          </div>
        )}

        {x.phase === 'review' && x.exam && (
          <div className="flex flex-col gap-6">
            {heading('Periksa sebelum mengirim')}
            {answered < total && <Alert tone="info" title={`${total - answered} soal belum dijawab`}>Soal kosong dihitung salah.</Alert>}
            <ol className="grid gap-2 sm:grid-cols-2">
              {x.exam.questions.map((qq, i) => (
                <li key={qq.id}>
                  <button type="button" onClick={() => (x.setIndex(i), x.setPhase('question'))} className="flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left text-sm font-semibold hover:bg-border">
                    <span className="truncate">
                      {i + 1}. {qq.text}
                    </span>
                    <span className={cn('ml-3 rounded-lg px-2.5 py-1 font-black', x.answers[qq.id] ? 'bg-lime' : 'bg-white text-destructive')}>
                      {x.answers[qq.id] ?? '–'}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={() => x.setPhase('question')}>
                Kembali
              </button>
              <button type="button" className={btnLime} onClick={x.submit}>
                Kirim jawaban
              </button>
            </div>
          </div>
        )}

        {x.phase === 'result' && x.result && (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <div className="flex size-40 flex-col items-center justify-center rounded-full bg-lime">
              <span className="text-6xl font-black">{x.result.score}</span>
              <span className="text-sm font-bold">nilai</span>
            </div>
            {heading('Jawaban terkirim!')}
            <p className="text-lg text-muted-foreground">
              Benar {x.result.correctCount} dari {x.result.totalQuestions} soal. Kerja bagus, {x.name}.
            </p>
            <button type="button" className={btnPrimary} onClick={x.reset}>
              Ujian lain
            </button>
          </div>
        )}

        {x.phase === 'error' && x.error && (
          <div className="flex flex-col gap-6">
            {x.error.code === 'NETWORK' && <WifiOff className="size-10" aria-hidden="true" />}
            {heading(x.error.code === 'NETWORK' ? 'Koneksi terputus' : 'Tidak bisa melanjutkan')}
            <Alert title={x.error.message}>{x.error.code === 'NETWORK' ? 'Jawaban Anda aman. Coba lagi saat online.' : 'Tanyakan PIN yang benar ke guru.'}</Alert>
            <div className="flex gap-3">
              <button type="button" className={btnLime} onClick={x.retry}>
                Coba lagi
              </button>
              <button type="button" className={btnSecondary} onClick={x.reset}>
                Mulai dari awal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
