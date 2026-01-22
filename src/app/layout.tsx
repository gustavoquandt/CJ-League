import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CJ Stats',
  description: 'Estatísticas e ranking da CJ League',
  
  // Open Graph (WhatsApp, Facebook, Telegram)
  openGraph: {
    title: 'CJ Stats',
    description: 'Estatísticas e ranking da CJ League',
    url: 'https://www.statscj.com', // ← SUBSTITUIR pelo seu domínio
    siteName: 'CJ Stats',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CJ Stats - Ranking da Liga',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'CJ Stats',
    description: 'Estatísticas e ranking da CJ League',
    images: ['/og-image.png'],
  },
  
  // Metadados adicionais
  keywords: ['CJ League', 'CS2', 'Counter-Strike', 'FACEIT', 'Ranking', 'Estatísticas'],
  authors: [{ name: 'CJ League' }],
  creator: 'CJ League',
  publisher: 'CJ League',
  robots: {
    index: true,
    follow: true,
  },
  
  // App icons
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Favicon automático pelo Next.js */}
      </head>
      <body>{children}</body>
    </html>
  )
}