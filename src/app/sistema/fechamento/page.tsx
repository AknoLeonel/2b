import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { escolherPosto, exigirSessao } from '@/lib/auth'
import { listarEncerrantes, listarEstoque } from '@/lib/dados'
import { horasDesde } from '@/lib/formato'
import { pode } from '@/lib/permissoes'
import { FormFechamento, type ProdutoFechamento } from './form-fechamento'

export const metadata: Metadata = { title: 'Fechamento de turno' }

// Leituras de encerrantes mais antigas que isso não são usadas como sugestão.
const JANELA_TURNO_HORAS = 18

export default async function Fechamento({ searchParams }: PageProps<'/sistema/fechamento'>) {
  const sessao = await exigirSessao()
  if (!pode.fechamento(sessao.perfil)) redirect('/sistema')
  const posto = escolherPosto(sessao, (await searchParams).posto)
  if (!posto) return <Vazio>Nenhum posto vinculado ao seu usuário.</Vazio>

  const [estoque, encerrantes] = await Promise.all([
    listarEstoque(sessao.supabase, posto.id),
    listarEncerrantes(sessao.supabase, posto.id),
  ])

  const recentes = encerrantes.filter((b) => b.valor !== null && horasDesde(b.lido_em) <= JANELA_TURNO_HORAS)
  const vendidoPorProduto = new Map<string, number>()
  for (const b of recentes) {
    if (!b.produto_codigo || b.valor_anterior === null || b.valor === null || b.valor < b.valor_anterior) continue
    vendidoPorProduto.set(
      b.produto_codigo,
      (vendidoPorProduto.get(b.produto_codigo) ?? 0) + (b.valor - b.valor_anterior),
    )
  }

  const produtos: ProdutoFechamento[] = estoque.map((t) => ({
    codigo: t.produto_codigo,
    nome: t.produto_nome,
    unidade: t.unidade,
    capacidade: t.capacidade,
    ultimaRegua: t.estoque,
    medidoEm: t.medido_em,
    sugestaoVendido: vendidoPorProduto.has(t.produto_codigo)
      ? Math.round(vendidoPorProduto.get(t.produto_codigo)! * 100) / 100
      : null,
  }))

  return (
    <>
      <TituloPagina
        titulo="Fechamento de turno"
        descricao={
          <>
            <strong>{posto.nome}</strong> · O estoque inicial vem preenchido com a última régua. Confira antes de
            salvar.
          </>
        }
        voltar={{ href: '/sistema/lancar', rotulo: 'Lançar' }}
      />
      {recentes.length === 0 ? (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Dica: lance primeiro os{' '}
          <Link className="font-bold underline" href="/sistema/encerrantes">
            encerrantes
          </Link>{' '}
          — o sistema calcula os litros vendidos de cada combustível.
        </p>
      ) : null}
      <FormFechamento
        posto={{ id: posto.id, nome: posto.nome }}
        produtos={produtos}
        encerrantes={recentes.map((b) => ({ numero: b.numero, valor: b.valor }))}
      />
    </>
  )
}
