import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { nivelDoTanque } from '@/lib/estoque'
import { fmtDataHora, horasDesde } from '@/lib/formato'
import type { EstoqueAtual, PostoResumo } from '@/lib/tipos'
import { MedidorTanque } from './medidor'

export function resumoAlertas(tanques: EstoqueAtual[]) {
  let criticos = 0
  let atencao = 0
  for (const t of tanques) {
    const { nivel } = nivelDoTanque(t.estoque, t.capacidade, t.alerta_critico_pct, t.alerta_atencao_pct)
    if (nivel === 'critico') criticos++
    if (nivel === 'atencao') atencao++
  }
  const ultima = tanques
    .map((t) => t.medido_em)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)
  return { criticos, atencao, ultima: ultima ?? null }
}

export function CartaoPosto({ posto, tanques }: { posto: PostoResumo; tanques: EstoqueAtual[] }) {
  const { criticos, atencao, ultima } = resumoAlertas(tanques)
  const desatualizado = horasDesde(ultima) > 24
  const borda = criticos ? 'border-l-marca' : atencao ? 'border-l-amber-500' : 'border-l-emerald-500'

  return (
    <article className={`cartao flex flex-col border-l-8 ${borda}`}>
      <Link
        href={`/sistema/postos/${posto.slug}`}
        className="flex items-start justify-between gap-2 rounded-t-2xl p-4 pb-2 hover:bg-slate-50"
      >
        <div>
          <h2 className="text-base font-extrabold text-tinta">{posto.nome}</h2>
          <p className={`text-xs ${desatualizado ? 'font-bold text-amber-700' : 'text-slate-500'}`}>
            {ultima ? `Última medição: ${fmtDataHora(ultima)}` : 'Nenhuma medição registrada'}
            {ultima && desatualizado ? ' · desatualizado' : ''}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-marca">
          Detalhes <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      </Link>
      {criticos || atencao ? (
        <p className="mx-4 mb-2 flex flex-wrap gap-1.5 text-xs font-bold">
          {criticos ? <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">{criticos} crítico(s)</span> : null}
          {atencao ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">{atencao} em atenção</span>
          ) : null}
        </p>
      ) : null}
      <div className="grid gap-2 p-4 pt-1">
        {tanques.map((t) => (
          <MedidorTanque key={t.tanque_id} tanque={t} />
        ))}
      </div>
    </article>
  )
}
