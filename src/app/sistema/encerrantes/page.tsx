import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { escolherPosto, exigirSessao } from '@/lib/auth'
import { listarEncerrantes } from '@/lib/dados'
import { pode } from '@/lib/permissoes'
import { FormEncerrantes } from './form-encerrantes'

export const metadata: Metadata = { title: 'Encerrantes' }

export default async function Encerrantes({ searchParams }: PageProps<'/sistema/encerrantes'>) {
  const sessao = await exigirSessao()
  if (!pode.encerrantes(sessao.perfil)) redirect('/sistema')
  const posto = escolherPosto(sessao, (await searchParams).posto)
  if (!posto) return <Vazio>Nenhum posto vinculado ao seu usuário.</Vazio>

  const bicos = await listarEncerrantes(sessao.supabase, posto.id)

  return (
    <>
      <TituloPagina
        titulo="Leitura de encerrantes"
        descricao={
          <>
            <strong>{posto.nome}</strong> · Informe a leitura atual de cada bico. Bicos em branco não são salvos.
          </>
        }
        voltar={{ href: '/sistema/lancar', rotulo: 'Lançar' }}
      />
      {bicos.length ? (
        <FormEncerrantes postoId={posto.id} bicos={bicos} />
      ) : (
        <Vazio>Nenhum bico cadastrado para este posto.</Vazio>
      )}
    </>
  )
}
