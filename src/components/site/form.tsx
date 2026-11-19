import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-ring aria-[invalid=true]:border-destructive disabled:opacity-60'

export const btnPrimary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111] px-6 text-sm font-bold text-white transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-60'

export const btnLime =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-bold text-lime-foreground transition-transform hover:scale-[1.02] disabled:pointer-events-none disabled:opacity-60'

export const btnSecondary =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60'

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export const Alert = forwardRef<
  HTMLDivElement,
  { tone?: 'error' | 'info' | 'success'; title: string; children?: React.ReactNode; className?: string }
>(function Alert({ tone = 'error', title, children, className }, ref) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-xl border p-4 text-sm',
        tone === 'error' && 'border-destructive/40 bg-destructive/5 text-destructive',
        tone === 'info' && 'border-border bg-muted text-foreground',
        tone === 'success' && 'border-success/40 bg-success/5 text-success',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 text-foreground/80">{children}</div>}
      </div>
    </div>
  )
})

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-muted', className)} />
}

export function EmptyState({
  icon: Icon,
  text,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  text: string
  action?: React.ReactNode
}) {
  return (
    <div data-state="empty" className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-base font-semibold">{text}</p>
      {action}
    </div>
  )
}
