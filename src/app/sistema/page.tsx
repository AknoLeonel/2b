import type { Metadata } from 'next'
import { exigirSessao } from '@/lib/auth'
import { ConteudoInicio } from './_secoes/inicio'

export const metadata: Metadata = { title: 'Início' }

export default async function Inicio({ searchParams }: PageProps<'/sistema'>) {
  const [sessao, params] = await Promise.all([exigirSessao(), searchParams])
  return <ConteudoInicio sessao={sessao} params={params} />
}
