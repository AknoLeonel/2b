import { MolduraPlanilha } from '@/components/sistema/planilha'
import { diasDeCobertura, nivelDoTanque, type Nivel } from '@/lib/estoque'
import { fmtNumero, fmtPct, tempoDesde } from '@/lib/formato'
import type { EstoqueAtual } from '@/lib/tipos'

export const ESTILO_NIVEL: Record<Nivel, { celula: string; barra: string; texto: string }> = {
  critico: { celula: 'bg-red-100 text-red-900', barra: 'bg-marca', texto: 'Crítico' },
  atencao: { celula: 'bg-amber-100 text-amber-950', barra: 'bg-amber-500', texto: 'Atenção' },
  ok: { celula: '', barra: 'bg-emerald-600', texto: 'Normal' },
  'sem-dado': { celula: 'text-slate-600', barra: 'bg-slate-300', texto: 'Sem medição' },
  'sem-capacidade': { celula: '', barra: 'bg-slate-400', texto: '' },
}

/** Situação dos tanques de um posto, em formato de planilha. */
export function TabelaTanques({ tanques }: { tanques: EstoqueAtual[] }) {
  if (!tanques.length) return <p className="text-base text-slate-700">Nenhum tanque cadastrado.</p>
  return (
    <MolduraPlanilha rotulo="Situação dos tanques">
      <table className="planilha min-w-[44rem]">
        <caption className="sr-only">Situação dos tanques</caption>
        <thead>
          <tr>
            <th scope="col" className="fixa text-left">
              Produto
            </th>
            <th scope="col">Estoque</th>
            <th scope="col">Nível</th>
            <th scope="col">Dá para</th>
            <th scope="col">Venda por dia</th>
            <th scope="col">Capacidade</th>
            <th scope="col">Medido</th>
          </tr>
        </thead>
        <tbody>
          {tanques.map((t) => {
            const { nivel, pct } = nivelDoTanque(t.estoque, t.capacidade, t.alerta_critico_pct, t.alerta_atencao_pct)
            const estilo = ESTILO_NIVEL[nivel]
            const dias = diasDeCobertura(t.estoque, t.media_diaria)
            return (
              <tr key={t.tanque_id}>
                <th scope="row" className="fixa">
                  {t.produto_nome}
                </th>
                <td className="num text-lg font-extrabold">
                  {t.estoque === null ? '—' : `${fmtNumero(t.estoque)} ${t.unidade}`}
                </td>
                <td className={`texto min-w-40 ${estilo.celula}`}>
                  {pct !== null ? (
                    <>
                      <span className="flex items-center justify-between gap-2 font-extrabold">
                        <span>{fmtPct(pct)}</span>
                        {nivel !== 'ok' ? <span>{estilo.texto}</span> : null}
                      </span>
                      <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <span
                          className={`block h-full rounded-full ${estilo.barra}`}
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">{estilo.texto || '—'}</span>
                  )}
                </td>
                <td className={`num font-bold ${dias !== null && dias < 2 ? 'bg-red-100 text-red-900' : ''}`}>
                  {dias === null ? '—' : `${fmtNumero(dias)} dia${dias >= 2 ? 's' : ''}`}
                </td>
                <td className="num">{t.media_diaria ? `${fmtNumero(t.media_diaria)} ${t.unidade}` : '—'}</td>
                <td className="num">{t.capacidade > 0 ? `${fmtNumero(t.capacidade)} ${t.unidade}` : '—'}</td>
                <td className="texto text-sm text-slate-700">
                  {tempoDesde(t.medido_em)}
                  {t.medido_por ? <span className="block">{t.medido_por}</span> : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </MolduraPlanilha>
  )
}
