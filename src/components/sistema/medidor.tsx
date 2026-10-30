import { diasDeCobertura, nivelDoTanque, type Nivel } from '@/lib/estoque'
import { fmtNumero, fmtPct, fmtVolume, tempoDesde } from '@/lib/formato'
import type { EstoqueAtual } from '@/lib/tipos'

const COR_BARRA: Record<Nivel, string> = {
  'sem-dado': 'bg-slate-300',
  'sem-capacidade': 'bg-slate-400',
  critico: 'bg-marca',
  atencao: 'bg-amber-500',
  ok: 'bg-emerald-500',
}

const SELO: Partial<Record<Nivel, { texto: string; classe: string }>> = {
  critico: { texto: 'Crítico', classe: 'bg-red-100 text-red-800' },
  atencao: { texto: 'Atenção', classe: 'bg-amber-100 text-amber-900' },
  'sem-dado': { texto: 'Sem medição', classe: 'bg-slate-100 text-slate-600' },
}

export function MedidorTanque({ tanque, detalhado = false }: { tanque: EstoqueAtual; detalhado?: boolean }) {
  const { nivel, pct } = nivelDoTanque(
    tanque.estoque,
    tanque.capacidade,
    tanque.alerta_critico_pct,
    tanque.alerta_atencao_pct,
  )
  const selo = SELO[nivel]
  const cobertura = diasDeCobertura(tanque.estoque, tanque.media_diaria)
  const largura = pct === null ? 0 : Math.max(2, Math.min(100, pct))

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-slate-800">{tanque.produto_nome}</span>
        <span className="tabular text-sm font-extrabold text-tinta">
          {tanque.estoque === null ? '—' : fmtVolume(tanque.estoque, tanque.unidade)}
        </span>
      </div>

      {tanque.capacidade > 0 ? (
        <>
          <div
            role="meter"
            aria-label={`Nível de ${tanque.produto_nome}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct === null ? undefined : Math.round(pct)}
            aria-valuetext={pct === null ? 'sem medição' : `${fmtPct(pct)} da capacidade`}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
          >
            <div className={`h-full rounded-full ${COR_BARRA[nivel]}`} style={{ width: `${largura}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="tabular">
              {fmtPct(pct)} de {fmtVolume(tanque.capacidade, tanque.unidade)}
            </span>
            {selo ? <span className={`rounded px-1.5 py-0.5 font-bold ${selo.classe}`}>{selo.texto}</span> : null}
          </div>
        </>
      ) : selo ? (
        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${selo.classe}`}>{selo.texto}</span>
      ) : null}

      {detalhado ? (
        <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 text-xs">
          <div>
            <dt className="text-slate-500">Média de venda/dia</dt>
            <dd className="tabular font-bold text-slate-800">
              {tanque.media_diaria ? fmtVolume(tanque.media_diaria, tanque.unidade) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Cobertura</dt>
            <dd
              className={`tabular font-bold ${cobertura !== null && cobertura < 2 ? 'text-red-700' : 'text-slate-800'}`}
            >
              {cobertura === null ? '—' : `${fmtNumero(cobertura)} dia${cobertura >= 2 ? 's' : ''}`}
            </dd>
          </div>
          <div className="col-span-2 text-slate-500">
            Medido {tempoDesde(tanque.medido_em)}
            {tanque.medido_por ? ` por ${tanque.medido_por}` : ''}
          </div>
        </dl>
      ) : null}
    </div>
  )
}
