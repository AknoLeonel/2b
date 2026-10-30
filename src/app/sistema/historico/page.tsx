import type { Metadata } from 'next'
import { TituloPagina, Vazio } from '@/components/sistema/ui'
import { escolherPosto, exigirSessao } from '@/lib/auth'
import { listarLancamentos, listarLeituras, listarProdutos } from '@/lib/dados'
import { fmtData, fmtHora, fmtNumero, hojeIso, intervaloDoDia } from '@/lib/formato'

export const metadata: Metadata = { title: 'Histórico' }

function dataValida(valor: string | string[] | undefined, hoje: string) {
  const v = Array.isArray(valor) ? valor[0] : valor
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= hoje ? v : hoje
}

export default async function Historico({ searchParams }: PageProps<'/sistema/historico'>) {
  const params = await searchParams
  const sessao = await exigirSessao()
  const posto = escolherPosto(sessao, params.posto)
  if (!posto) return <Vazio>Nenhum posto vinculado ao seu usuário.</Vazio>

  const hoje = hojeIso()
  const data = dataValida(params.data, hoje)
  const { inicio, fim } = intervaloDoDia(data)

  const [lancamentos, leituras, produtos] = await Promise.all([
    listarLancamentos(sessao.supabase, { postoId: posto.id, inicio, fim }),
    listarLeituras(sessao.supabase, { postoId: posto.id, inicio, fim }),
    listarProdutos(sessao.supabase),
  ])
  const produto = new Map(produtos.map((p) => [p.codigo, p]))

  const eventos = [
    ...lancamentos.map((l) => ({ tipo: 'lancamento' as const, em: l.criado_em, l })),
    ...leituras.map((r) => ({ tipo: 'leitura' as const, em: r.criado_em, r })),
  ].sort((a, b) => b.em.localeCompare(a.em))

  const trintaDiasAtras = hojeIso(new Date(Date.now() - 29 * 86_400_000))

  return (
    <>
      <TituloPagina titulo="Histórico de lançamentos" descricao="Consulta por dia para o LMC e auditoria." />

      <form method="get" className="cartao mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="hist-posto" className="rotulo">
            Posto
          </label>
          <select
            id="hist-posto"
            name="posto"
            defaultValue={posto.slug}
            className="campo"
            disabled={sessao.postos.length < 2}
          >
            {sessao.postos.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="hist-data" className="rotulo">
            Dia
          </label>
          <input id="hist-data" name="data" type="date" defaultValue={data} max={hoje} className="campo" />
        </div>
        <button type="submit" className="botao-escuro">
          Consultar
        </button>
      </form>

      <h2 className="mb-3 text-lg font-extrabold text-tinta">
        {posto.nome} · {fmtData(data)}
      </h2>

      {eventos.length === 0 ? (
        <Vazio>Nenhum registro neste dia.</Vazio>
      ) : (
        <ol className="space-y-4">
          {eventos.map((ev) =>
            ev.tipo === 'lancamento' ? (
              <li key={ev.l.id} className="cartao overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5">
                  <span className="font-extrabold text-tinta">⏱ {fmtHora(ev.l.criado_em)}</span>
                  <span className="text-xs text-slate-600">{ev.l.criado_por_nome}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-extrabold uppercase ${
                      ev.l.tipo === 'fechamento' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
                    }`}
                  >
                    {ev.l.tipo === 'fechamento' ? 'Fechamento de turno' : 'Atualização rápida'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-2">
                          Produto
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Inicial
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Descarga
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Vendido
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Final calc.
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Régua
                        </th>
                        <th scope="col" className="px-4 py-2 text-right">
                          Diferença
                        </th>
                      </tr>
                    </thead>
                    <tbody className="tabular divide-y divide-slate-100">
                      {[...ev.l.lancamento_itens]
                        .sort(
                          (a, b) =>
                            (produto.get(a.produto_codigo)?.ordem ?? 0) - (produto.get(b.produto_codigo)?.ordem ?? 0),
                        )
                        .map((i) => (
                          <tr key={i.produto_codigo}>
                            <th scope="row" className="px-4 py-2 text-left font-bold text-slate-800">
                              {produto.get(i.produto_codigo)?.nome ?? i.produto_codigo}
                            </th>
                            <td className="px-4 py-2 text-right">{fmtNumero(i.estoque_inicial)}</td>
                            <td className="px-4 py-2 text-right">{fmtNumero(i.descarga)}</td>
                            <td className="px-4 py-2 text-right">{fmtNumero(i.vendido)}</td>
                            <td className="px-4 py-2 text-right">{fmtNumero(i.estoque_final)}</td>
                            <td className="px-4 py-2 text-right font-bold">{fmtNumero(i.regua)}</td>
                            <td
                              className={`px-4 py-2 text-right font-bold ${
                                i.diferenca === null ? '' : i.diferenca < 0 ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {fmtNumero(i.diferenca)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {ev.l.observacao ? (
                  <p className="border-t border-slate-100 px-4 py-2 text-sm text-slate-600">📝 {ev.l.observacao}</p>
                ) : null}
              </li>
            ) : (
              <li key={ev.r.id} className="cartao overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5">
                  <span className="font-extrabold text-tinta">⏱ {fmtHora(ev.r.criado_em)}</span>
                  <span className="text-xs text-slate-600">{ev.r.criado_por_nome}</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-extrabold uppercase text-amber-900">
                    Encerrantes
                  </span>
                </div>
                <ul className="tabular grid grid-cols-2 gap-x-6 gap-y-1 p-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
                  {[...ev.r.leitura_itens]
                    .sort((a, b) => (a.bicos?.numero ?? 0) - (b.bicos?.numero ?? 0))
                    .map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                        <span className="font-semibold text-slate-600">Bico {i.bicos?.numero}</span>
                        <span className="font-bold text-sky-800">{fmtNumero(i.valor, 3)}</span>
                      </li>
                    ))}
                </ul>
                {ev.r.observacao ? (
                  <p className="border-t border-slate-100 px-4 py-2 text-sm text-slate-600">📝 {ev.r.observacao}</p>
                ) : null}
              </li>
            ),
          )}
        </ol>
      )}

      <form
        method="get"
        action="/sistema/historico/exportar"
        className="cartao mt-8 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <input type="hidden" name="posto" value={posto.slug} />
        <p className="text-sm font-bold text-tinta sm:col-span-3">Exportar planilha (CSV) de {posto.nome}</p>
        <div>
          <label htmlFor="exp-de" className="rotulo">
            De
          </label>
          <input id="exp-de" name="de" type="date" defaultValue={trintaDiasAtras} max={hoje} className="campo" />
        </div>
        <div>
          <label htmlFor="exp-ate" className="rotulo">
            Até
          </label>
          <input id="exp-ate" name="ate" type="date" defaultValue={hoje} max={hoje} className="campo" />
        </div>
        <button type="submit" className="botao-secundario">
          Baixar CSV
        </button>
      </form>
    </>
  )
}
