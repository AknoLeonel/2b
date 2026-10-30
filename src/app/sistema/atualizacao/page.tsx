import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SeletorPosto } from '@/components/sistema/seletor-posto'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { escolherPosto, exigirSessao } from '@/lib/auth'
import { listarEstoque } from '@/lib/dados'
import { pode } from '@/lib/permissoes'
import { FormAtualizacao } from './form-atualizacao'

export const metadata: Metadata = { title: 'Atualização rápida' }

export default async function Atualizacao({ searchParams }: PageProps<'/sistema/atualizacao'>) {
  const sessao = await exigirSessao()
  if (!pode.atualizacao(sessao.perfil)) redirect('/sistema')
  const posto = escolherPosto(sessao, (await searchParams).posto)
  if (!posto) return <Vazio>Nenhum posto vinculado ao seu usuário.</Vazio>

  const estoque = await listarEstoque(sessao.supabase, posto.id)

  return (
    <>
      <TituloPagina
        titulo="Atualização rápida de estoque"
        descricao={
          <>
            <strong>{posto.nome}</strong> · Atualize a régua de um ou mais tanques fora do horário de fechamento.
          </>
        }
        acoes={<SeletorPosto postos={sessao.postos} atual={posto.slug} />}
      />
      <FormAtualizacao key={posto.id} postoId={posto.id} tanques={estoque} />
    </>
  )
}
