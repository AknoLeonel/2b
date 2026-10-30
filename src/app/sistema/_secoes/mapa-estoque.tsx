import Link from 'next/link'
import { MolduraPlanilha } from '@/components/sistema/planilha'
import { nivelDoTanque } from '@/lib/estoque'
import { fmtNumero, fmtPct, horasDesde, tempoDesde } from '@/lib/formato'
import type { EstoqueAtual, PostoResumo } from '@/lib/tipos'
import { ESTILO_NIVEL } from './tanques'

/** Planilha da rede: uma linha por posto, uma coluna por produto. */
export function MapaEstoque({ postos, estoque }: { postos: PostoResumo[]; estoque: EstoqueAtual[] }) {
  const produtos = [
    ...new Map(
      [...estoque]
        .sort((a, b) => a.ordem - b.ordem)
        .map((t) => [t.produto_codigo, { nome: t.produto_nome, unidade: t.unidade }]),
    ).entries(),
  ]
  const celula = new Map(estoque.map((t) => [`${t.posto_id}:${t.produto_codigo}`, t]))
  const totais = new Map<string, number>()
  for (const t of estoque)
    if (t.estoque !== null) totais.set(t.produto_codigo, (totais.get(t.produto_codigo) ?? 0) + t.estoque)

  return (
    <MolduraPlanilha rotulo="Estoque da rede por posto e produto">
      <table className="planilha min-w-[60rem]">
        <caption className="sr-only">Estoque da rede: postos nas linhas, produtos nas colunas</caption>
        <thead>
          <tr>
            <th scope="col" className="fixa text-left">
              Posto
            </th>
            {produtos.map(([codigo, p]) => (
              <th key={codigo} scope="col">
                {p.nome}
              </th>
            ))}
            <th scope="col">Última medição</th>
          </tr>
        </thead>
        <tbody>
          {postos.map((posto) => {
            const ultima = estoque
              .filter((t) => t.posto_id === posto.id && t.medido_em)
              .map((t) => t.medido_em as string)
              .sort()
              .at(-1)
            return (
              <tr key={posto.id}>
                <th scope="row" className="fixa">
                  <Link href={`/sistema/postos/${posto.slug}`} className="text-marca underline underline-offset-4">
                    {posto.nome}
                  </Link>
                </th>
                {produtos.map(([codigo]) => {
                  const t = celula.get(`${posto.id}:${codigo}`)
                  if (!t) return <td key={codigo} className="num bg-slate-50 text-slate-500" aria-label="não vende" />
                  const { nivel, pct } = nivelDoTanque(
                    t.estoque,
                    t.capacidade,
                    t.alerta_critico_pct,
                    t.alerta_atencao_pct,
                  )
                  const estilo = ESTILO_NIVEL[nivel]
                  return (
                    <td key={codigo} className={`num ${estilo.celula}`}>
                      <span className="block text-lg font-extrabold">
                        {t.estoque === null ? '—' : `${fmtNumero(t.estoque)}${t.unidade === 'un' ? ' un' : ''}`}
                      </span>
                      <span className="block text-sm font-bold">
                        {pct !== null
                          ? `${fmtPct(pct)}${nivel === 'critico' || nivel === 'atencao' ? ` · ${estilo.texto}` : ''}`
                          : estilo.texto}
                      </span>
                    </td>
                  )
                })}
                <td
                  className={`texto text-sm ${horasDesde(ultima) > 24 ? 'bg-amber-100 font-bold text-amber-950' : 'text-slate-700'}`}
                >
                  {tempoDesde(ultima)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="fixa text-left">
              TOTAL DA REDE
            </th>
            {produtos.map(([codigo, p]) => (
              <td key={codigo} className="num">
                {totais.has(codigo) ? `${fmtNumero(totais.get(codigo))} ${p.unidade}` : '—'}
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </MolduraPlanilha>
  )
}
