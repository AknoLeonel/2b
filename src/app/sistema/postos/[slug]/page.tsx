import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AtualizacaoAoVivo } from '@/components/sistema/atualizacao-ao-vivo'
import { BarraAtalhos, LinkVoltar, Secao } from '@/components/sistema/secao'
import { exigirSessao } from '@/lib/auth'
import { listarEncerrantes, listarEstoque } from '@/lib/dados'
import { pode } from '@/lib/permissoes'
import { TabelaAtualizacao } from '../../_secoes/atualizacao'
import { TabelaEncerrantesAtuais } from '../../_secoes/encerrantes-atuais'
import { diaValido, SecaoHistorico } from '../../_secoes/historico'
import { TabelaTanques } from '../../_secoes/tanques'

export const metadata: Metadata = { title: 'Posto' }

export default async function DetalhePosto({ params, searchParams }: PageProps<'/sistema/postos/[slug]'>) {
  const [{ slug }, busca, sessao] = await Promise.all([params, searchParams, exigirSessao()])
  const posto = sessao.postos.find((p) => p.slug === slug)
  if (!posto) notFound()

  const [tanques, bicos] = await Promise.all([
    listarEstoque(sessao.supabase, posto.id),
    listarEncerrantes(sessao.supabase, posto.id),
  ])
  const podeAtualizar = pode.atualizacao(sessao.perfil)
  const itens = [
    { id: 'tanques', rotulo: 'Tanques' },
    ...(podeAtualizar ? [{ id: 'atualizacao', rotulo: 'Atualizar régua' }] : []),
    { id: 'encerrantes', rotulo: 'Encerrantes' },
    { id: 'historico', rotulo: 'Histórico' },
  ]
  let n = 0

  return (
    <>
      <div className="pb-2 pt-5">
        <LinkVoltar />
        <h1 className="text-3xl font-extrabold text-tinta">{posto.nome}</h1>
      </div>
      <BarraAtalhos itens={itens} />
      <Secao
        id="tanques"
        numero={++n}
        titulo="Situação dos tanques"
        acoes={<AtualizacaoAoVivo tabelas={['lancamentos', 'leituras_encerrantes']} />}
      >
        <TabelaTanques tanques={tanques} />
      </Secao>
      {podeAtualizar ? (
        <Secao id="atualizacao" numero={++n} titulo="Atualização rápida da régua">
          <TabelaAtualizacao postoId={posto.id} tanques={tanques} />
        </Secao>
      ) : null}
      <Secao id="encerrantes" numero={++n} titulo="Últimas leituras dos encerrantes">
        <TabelaEncerrantesAtuais bicos={bicos} />
      </Secao>
      <Secao id="historico" numero={++n} titulo="Histórico (LMC)">
        <SecaoHistorico
          sessao={sessao}
          posto={posto}
          dia={diaValido(busca.dia)}
          caminho={`/sistema/postos/${posto.slug}`}
          podeTrocarPosto={false}
        />
      </Secao>
    </>
  )
}
