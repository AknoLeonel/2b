import { ImageResponse } from 'next/og'
import { SeloMarca } from '@/components/imagem-marca'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<SeloMarca tamanho={180} margem={18} />, size)
}
