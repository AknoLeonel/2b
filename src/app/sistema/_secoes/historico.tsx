import Link from 'next/link'
import { MolduraPlanilha } from '@/components/sistema/planilha'
import { SeletorPosto } from '@/components/sistema/seletor-posto'
import type { Sessao } from '@/lib/auth'
import { listarLancamentos, listarLeituras, listarProdutos } from '@/lib/dados'
import { fmtData, fmtHora, fmtNumero, hojeIso, intervaloDoDia } from '@/lib/formato'
import type { PostoResumo } from '@/lib/tipos'

/** Lê ?dia= (yyyy-mm-dd); datas inválidas ou futuras viram hoje. */
export function diaValido(valor: string | string[] | undefined) {
  const hoje = hojeIso()
  const v = Array.isArray(valor) ? valor[0] : valor
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v <= hoje ? v : hoje
}

function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const NOMES_DIA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export async function SecaoHistorico({
  sessao,
  posto,
  dia,
  caminho,
  podeTrocarPosto,
}: {
  sessao: Sessao
  posto: PostoResumo
  dia: string
  caminho: string
  podeTrocarPosto: boolean
}) {
  const hoje = hojeIso()
  const { inicio, fim } = intervaloDoDia(dia)
  const [lancamentos, leituras, produtos] = await Promise.all([
    listarLancamentos(sessao.supabase, { postoId: posto.id, inicio, fim }),
    listarLeituras(sessao.supabase, { postoId: posto.id, inicio, fim }),
    listarProdutos(sessao.supabase),
  ])
  const produto = new Map(produtos.map((p) => [p.codigo, p]))
  const numerosBicos = [...new Set(leituras.flatMap((l) => l.leitura_itens.map((i) => i.bicos?.numero ?? 0)))]
    .filter(Boolean)
    .sort((a, b) => a - b)

  const link = (d: string) => {
    const p = new URLSearchParams({ dia: d })
    if (podeTrocarPosto) p.set('posto', posto.slug)
    return `${caminho}?${p.toString()}#historico`
  }
  const anterior = somarDias(dia, -1)
  const proximo = somarDias(dia, 1)
  const botaoDia =
    'flex min-h-13 items-center justify-center rounded-xl border-2 border-slate-500 bg-white px-4 text-lg font-bold text-slate-900 hover:border-marca hover:text-marca'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-2xl font-extrabold text-tinta">
            {fmtData(dia)}{' '}
            <span className="text-lg font-bold text-slate-700">
              ({dia === hoje ? 'hoje' : NOMES_DIA[new Date(`${dia}T12:00:00Z`).getUTCDay()]})
            </span>
          </p>
          <p className="text-base text-slate-700">{posto.nome}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {podeTrocarPosto ? <SeletorPosto postos={sessao.postos} atual={posto.slug} ancora="historico" /> : null}
          <form method="get" action={`${caminho}#historico`} className="flex items-end gap-2">
            {podeTrocarPosto ? <input type="hidden" name="posto" value={posto.slug} /> : null}
            <div>
              <label htmlFor={`dia-${posto.slug}`} className="rotulo">
                Ir para o dia
              </label>
              <input id={`dia-${posto.slug}`} name="dia" type="date" defaultValue={dia} max={hoje} className="campo" />
            </div>
            <button type="submit" className="botao-escuro">
              Ver
            </button>
          </form>
          <nav aria-label="Escolher o dia" className="grid grid-cols-3 gap-2">
            <Link href={link(anterior)} className={botaoDia}>
              ◀ Anterior
            </Link>
            <Link href={link(hoje)} className={botaoDia} aria-current={dia === hoje ? 'date' : undefined}>
              Hoje
            </Link>
            {proximo <= hoje ? (
              <Link href={link(proximo)} className={botaoDia}>
                Próximo ▶
              </Link>
            ) : (
              <span className={`${botaoDia} cursor-not-allowed opacity-40`} aria-disabled="true">
                Próximo ▶
              </span>
            )}
          </nav>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-extrabold text-tinta">Planilhas e atualizações</h3>
        {lancamentos.length ? (
          <MolduraPlanilha rotulo="Planilhas do dia">
            <table className="planilha min-w-[62rem]">
              <caption className="sr-only">Planilhas e atualizações de {fmtData(dia)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="fixa text-left">
                    Hora
                  </th>
                  <th scope="col">Produto</th>
                  <th scope="col">Est. inicial</th>
                  <th scope="col">Descarga</th>
                  <th scope="col">Vendido</th>
                  <th scope="col" className="calc">
                    Est. final
                  </th>
                  <th scope="col" className="text-marca">
                    Régua
                  </th>
                  <th scope="col" className="calc">
                    Diferença
                  </th>
                  <th scope="col">Quem lançou</th>
                </tr>
              </thead>
              {[...lancamentos].reverse().map((l) => {
                const itens = [...l.lancamento_itens].sort(
                  (a, b) => (produto.get(a.produto_codigo)?.ordem ?? 0) - (produto.get(b.produto_codigo)?.ordem ?? 0),
                )
                const linhas = itens.length + (l.observacao ? 1 : 0)
                const totalVendido = itens.reduce((s, i) => s + (i.vendido ?? 0), 0)
                return (
                  <tbody key={l.id}>
                    {itens.map((i, idx) => (
                      <tr key={`${l.id}-${i.produto_codigo}`}>
                        {idx === 0 ? (
                          <th scope="rowgroup" rowSpan={linhas} className="fixa align-top">
                            {fmtHora(l.criado_em)}
                            <span
                              className={`mt-1 block w-fit rounded px-1.5 py-0.5 text-xs font-extrabold uppercase ${
                                l.tipo === 'fechamento' ? 'bg-sky-100 text-sky-900' : 'bg-violet-100 text-violet-900'
                              }`}
                            >
                              {l.tipo === 'fechamento' ? 'Fechamento' : 'Atualização'}
                            </span>
                            {l.tipo === 'fechamento' && totalVendido ? (
                              <span className="mt-1 block text-sm font-semibold text-slate-700">
                                Vendido: {fmtNumero(totalVendido)} L
                              </span>
                            ) : null}
                          </th>
                        ) : null}
                        <td className="texto font-bold">{produto.get(i.produto_codigo)?.nome ?? i.produto_codigo}</td>
                        <td className="num">{fmtNumero(i.estoque_inicial)}</td>
                        <td className="num">{fmtNumero(i.descarga)}</td>
                        <td className="num">{fmtNumero(i.vendido)}</td>
                        <td className="calc num">{fmtNumero(i.estoque_final)}</td>
                        <td className="num font-extrabold">{fmtNumero(i.regua)}</td>
                        <td
                          className={`calc num ${
                            i.diferenca === null
                              ? ''
                              : i.diferenca < 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {i.diferenca === null ? '—' : `${i.diferenca > 0 ? '+' : ''}${fmtNumero(i.diferenca)}`}
                        </td>
                        {idx === 0 ? (
                          <td rowSpan={linhas} className="texto align-top text-sm font-semibold">
                            {l.criado_por_nome}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                    {l.observacao ? (
                      <tr>
                        <td colSpan={7} className="texto text-base text-slate-800">
                          📝 {l.observacao}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                )
              })}
            </table>
          </MolduraPlanilha>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center text-lg text-slate-700">
            Nenhuma planilha lançada neste dia.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xl font-extrabold text-tinta">Encerrantes</h3>
        {leituras.length ? (
          <MolduraPlanilha rotulo="Encerrantes do dia">
            <table className="planilha" style={{ minWidth: `${12 + numerosBicos.length * 8}rem` }}>
              <caption className="sr-only">Leituras de encerrantes de {fmtData(dia)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="fixa text-left">
                    Hora
                  </th>
                  {numerosBicos.map((n) => (
                    <th key={n} scope="col">
                      Bico {n}
                    </th>
                  ))}
                  <th scope="col">Quem lançou</th>
                </tr>
              </thead>
              <tbody>
                {[...leituras].reverse().flatMap((l) => {
                  const porBico = new Map(l.leitura_itens.map((i) => [i.bicos?.numero, i.valor]))
                  return [
                    <tr key={l.id}>
                      <th scope="row" className="fixa">
                        {fmtHora(l.criado_em)}
                      </th>
                      {numerosBicos.map((n) => (
                        <td key={n} className="num">
                          {fmtNumero(porBico.get(n), 3)}
                        </td>
                      ))}
                      <td className="texto text-sm font-semibold">{l.criado_por_nome}</td>
                    </tr>,
                    ...(l.observacao
                      ? [
                          <tr key={`${l.id}-obs`}>
                            <td colSpan={numerosBicos.length + 2} className="texto text-base text-slate-800">
                              📝 {l.observacao}
                            </td>
                          </tr>,
                        ]
                      : []),
                  ]
                })}
              </tbody>
            </table>
          </MolduraPlanilha>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center text-lg text-slate-700">
            Nenhuma leitura de encerrantes neste dia.
          </p>
        )}
      </div>

      <form
        method="get"
        action="/sistema/historico/exportar"
        className="cartao grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <input type="hidden" name="posto" value={posto.slug} />
        <p className="text-lg font-bold text-tinta sm:col-span-3">Baixar planilha para o Excel (CSV)</p>
        <div>
          <label htmlFor={`exp-de-${posto.slug}`} className="rotulo">
            De
          </label>
          <input
            id={`exp-de-${posto.slug}`}
            name="de"
            type="date"
            defaultValue={somarDias(hoje, -29)}
            max={hoje}
            className="campo"
          />
        </div>
        <div>
          <label htmlFor={`exp-ate-${posto.slug}`} className="rotulo">
            Até
          </label>
          <input id={`exp-ate-${posto.slug}`} name="ate" type="date" defaultValue={hoje} max={hoje} className="campo" />
        </div>
        <button type="submit" className="botao-secundario">
          Baixar
        </button>
      </form>
    </div>
  )
}
