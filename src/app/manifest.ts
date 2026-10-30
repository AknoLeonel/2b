import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Postos 2B — Sistema interno',
    short_name: 'Postos 2B',
    description: 'Controle de estoque, encerrantes e empréstimos da Rede de Postos 2B.',
    lang: 'pt-BR',
    start_url: '/sistema',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f5f2',
    theme_color: '#da291c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
