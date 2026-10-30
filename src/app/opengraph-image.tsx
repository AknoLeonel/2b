import { ImageResponse } from 'next/og'
import { CapaMarca } from '@/components/imagem-marca'

export const alt = 'Postos 2B — Rede de postos de combustível'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <CapaMarca titulo="Rede de Postos 2B" subtitulo="Diesel S-10 e S-500, gasolina, etanol e Arla 32" />,
    size,
  )
}
