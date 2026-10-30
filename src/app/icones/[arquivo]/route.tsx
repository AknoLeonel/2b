import { ImageResponse } from 'next/og'
import { SeloMarca } from '@/components/imagem-marca'

const ICONES: Record<string, { tamanho: number; margem: number }> = {
  'icone-192.png': { tamanho: 192, margem: 12 },
  'icone-512.png': { tamanho: 512, margem: 32 },
  'icone-maskable-512.png': { tamanho: 512, margem: 96 },
  'logo-512.png': { tamanho: 512, margem: 32 },
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(ICONES).map((arquivo) => ({ arquivo }))
}

export async function GET(_req: Request, { params }: RouteContext<'/icones/[arquivo]'>) {
  const { arquivo } = await params
  const icone = ICONES[arquivo]
  if (!icone) return new Response('Não encontrado', { status: 404 })
  return new ImageResponse(<SeloMarca tamanho={icone.tamanho} margem={icone.margem} />, {
    width: icone.tamanho,
    height: icone.tamanho,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
