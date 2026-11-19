/**
 * NusaTara brand mark: an open book giving off sound (logo option 9).
 * Everything uses currentColor; pass `accent` to colour the right page and the inner sound arc
 * (the full-colour logo is white + lime #D4FE3E on #111111).
 */
export function BrandMark({ className = 'size-5', accent }: { className?: string; accent?: string }) {
  const second = accent ?? 'currentColor'
  return (
    <svg className={className} viewBox="18 15.5 64 64" fill="none" aria-hidden="true">
      <path d="M48.5 48C41 42 30 42 20 46V76C30 72 41 72 48.5 78Z" fill="currentColor" />
      <path d="M51.5 48C59 42 70 42 80 46V76C70 72 59 72 51.5 78Z" fill={second} />
      <path d="M41 34A12 12 0 0 1 59 34" stroke={second} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M34 26A22 22 0 0 1 66 26" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}
