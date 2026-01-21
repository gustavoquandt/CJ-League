import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FACEIT Hub Stats - Mix Dez 2025',
  description: 'Sistema de estatísticas para HUB privado da FACEIT - Mix Dez 2025',
  keywords: ['faceit', 'cs2', 'stats', 'hub', 'gaming'],
  authors: [{ name: 'Mix Dez 2025' }],
  openGraph: {
    title: 'FACEIT Hub Stats - Mix Dez 2025',
    description: 'Ranking e estatísticas dos jogadores do hub',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
