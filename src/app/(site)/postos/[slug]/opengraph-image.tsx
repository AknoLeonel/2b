import { ImageResponse } from 'next/og'
import { CapaMarca } from '@/components/imagem-marca'
import { localidade, obterPostoPublico } from '@/lib/site'

export const alt = 'Posto da Rede 2B'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const posto = await obterPostoPublico(slug)
  const lugar = posto ? localidade(posto) : ''
  const produtos = posto?.produtos.map((p) => p.nome).join(' · ') ?? ''
  return new ImageResponse(
    <CapaMarca titulo={posto?.nome ?? 'Rede de Postos 2B'} subtitulo={lugar || produtos} />,
    size,
  )
}
