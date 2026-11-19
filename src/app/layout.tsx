import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { OfflineBanner } from '@/components/site/offline-banner'
import { SpeechGuard } from '@/components/site/speech-guard'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Nusatara — Platform belajar untuk setiap siswa',
    template: '%s · Nusatara',
  },
  description:
    'Platform pendidikan inklusif: guru mengubah materi menjadi audio dan ringkasan visual, siswa tunanetra belajar dan ujian dengan suara, siswa tunarungu belajar secara visual.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Smooth scroll for in-page links (#keunggulan, #portal), off under prefers-reduced-motion.
    // data-scroll-behavior lets Next.js switch it off during route changes so new pages open at the top instantly.
    <html lang="id" className="bg-background motion-safe:scroll-smooth" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <OfflineBanner />
        <SpeechGuard />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
