import type { Metadata, Viewport } from 'next'
import { SITE_URL } from '@/lib/env'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Postos 2B — Rede de postos de combustível',
    template: '%s | Postos 2B',
  },
  description:
    'Rede de Postos 2B: 7 postos com Diesel S-10, Diesel S-500, gasolina comum e aditivada, etanol e Arla 32. Encontre o posto mais próximo e fale com a gente.',
  applicationName: 'Postos 2B',
  authors: [{ name: 'Rede de Postos 2B' }],
  creator: 'Rede de Postos 2B',
  publisher: 'Rede de Postos 2B',
  category: 'Postos de combustível',
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Postos 2B',
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  appleWebApp: { capable: true, title: 'Postos 2B', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#da291c',
  colorScheme: 'light',
}

// Aplica o tamanho de letra escolhido no sistema (A− / A+) antes de desenhar a tela.
const SCRIPT_LETRA = `try{var n=localStorage.getItem('postos2b:letra');if(n==='1'||n==='2')document.documentElement.dataset.letra=n}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_LETRA }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
