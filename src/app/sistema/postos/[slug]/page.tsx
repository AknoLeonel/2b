import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AtualizacaoAoVivo } from '@/components/sistema/atualizacao-ao-vivo'
import { MedidorTanque } from '@/components/sistema/medidor'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { exigirSessao } from '@/lib/auth'
import { listarEncerrantes, listarEstoque, listarLancamentos } from '@/lib/dados'
import { fmtDataHora, fmtNumero, fmtVolume, tempoDesde } from '@/lib/formato'
import { pode } from '@/lib/permissoes'

export const metadata: Metadata = { title: 'Posto' }

export default async function DetalhePosto({ params }: PageProps<'/sistema/postos/[slug]'>) {
  const { slug } = await params
  const sessao = await exigirSessao()
  const posto = sessao.postos.find((p) => p.slug === slug) ?? null
  if (!posto) notFound()

  const [estoque, encerrantes, lancamentos] = await Promise.all([
    listarEstoque(sessao.supabase, posto.id),
    listarEncerrantes(sessao.supabase, posto.id),
    listarLancamentos(sessao.supabase, { postoId: posto.id, limite: 8 }),
  ])
  const nomeProduto = new Map(estoque.map((t) => [t.produto_codigo, t.produto_nome]))
  const { perfil } = sessao

  return (
    <>
      <TituloPagina
        titulo={posto.nome}
        voltar={{ href: '/sistema', rotulo: 'Painel' }}
        acoes={
          <>
            <AtualizacaoAoVivo tabelas={['lancamentos', 'leituras_encerrantes']} />
            {pode.atualizacao(perfil) ? (
              <Link href={`/sistema/atualizacao?posto=${posto.slug}`} className="botao-secundario min-h-11 text-sm">
                Atualização rápida
              </Link>
            ) : null}
            <Link href={`/sistema/historico?posto=${posto.slug}`} className="botao-secundario min-h-11 text-sm">
              Histórico
            </Link>
          </>
        }
      />

      <section aria-labelledby="titulo-tanques" className="mb-8">
        <h2 id="titulo-tanques" className="mb-3 text-lg font-extrabold text-tinta">
          Tanques
        </h2>
        {estoque.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {estoque.map((t) => (
              <MedidorTanque key={t.tanque_id} tanque={t} detalhado />
            ))}
          </div>
        ) : (
          <Vazio>Nenhum tanque cadastrado.</Vazio>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="titulo-encerrantes" className="cartao overflow-hidden">
          <h2 id="titulo-encerrantes" className="border-b border-slate-100 p-4 text-lg font-extrabold text-tinta">
            Encerrantes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-2">
                    Bico
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Leitura
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Desde a anterior
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {encerrantes.map((b) => {
                  const delta = b.valor !== null && b.valor_anterior !== null ? b.valor - b.valor_anterior : null
                  return (
                    <tr key={b.bico_id}>
                      <td className="px-4 py-2">
                        <span className="font-bold text-slate-800">Bico {b.numero}</span>
                        <span className="block text-xs text-slate-500">{b.descricao}</span>
                      </td>
                      <td className="tabular px-4 py-2 text-right">
                        <span className="font-bold text-sky-800">{fmtNumero(b.valor, 3)}</span>
                        <span className="block text-xs text-slate-500">{tempoDesde(b.lido_em)}</span>
                      </td>
                      <td
                        className={`tabular px-4 py-2 text-right font-semibold ${
                          delta !== null && delta < 0 ? 'text-red-700' : 'text-slate-700'
                        }`}
                      >
                        {delta === null ? '—' : `${fmtNumero(delta, 3)} L`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="titulo-lancamentos" className="cartao overflow-hidden">
          <h2 id="titulo-lancamentos" className="border-b border-slate-100 p-4 text-lg font-extrabold text-tinta">
            Últimos lançamentos
          </h2>
          {lancamentos.length ? (
            <ul className="divide-y divide-slate-100">
              {lancamentos.map((l) => {
                const vendido = l.lancamento_itens.reduce((s, i) => s + (i.vendido ?? 0), 0)
                return (
                  <li key={l.id} className="p-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">{fmtDataHora(l.criado_em)}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          l.tipo === 'fechamento' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
                        }`}
                      >
                        {l.tipo === 'fechamento' ? 'Fechamento' : 'Atualização'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{l.criado_por_nome}</p>
                    <p className="mt-1 text-slate-700">
                      {l.lancamento_itens.map((i) => nomeProduto.get(i.produto_codigo) ?? i.produto_codigo).join(', ')}
                      {l.tipo === 'fechamento' && vendido ? ` · vendido ${fmtVolume(vendido)}` : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">Nenhum lançamento ainda.</p>
          )}
        </section>
      </div>
    </>
  )
}
