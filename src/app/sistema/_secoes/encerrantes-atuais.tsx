import { MolduraPlanilha } from '@/components/sistema/planilha'
import { fmtNumero, tempoDesde } from '@/lib/formato'
import type { EncerranteAtual } from '@/lib/tipos'

/** Últimas leituras de cada bico (somente leitura). */
export function TabelaEncerrantesAtuais({ bicos }: { bicos: EncerranteAtual[] }) {
  if (!bicos.length) return <p className="text-base text-slate-700">Nenhum bico cadastrado.</p>
  return (
    <MolduraPlanilha rotulo="Últimas leituras dos encerrantes">
      <table className="planilha min-w-[36rem]">
        <caption className="sr-only">Últimas leituras dos encerrantes</caption>
        <thead>
          <tr>
            <th scope="col" className="fixa text-left">
              Bico
            </th>
            <th scope="col">Última leitura</th>
            <th scope="col">Anterior</th>
            <th scope="col" className="calc">
              Litros
            </th>
          </tr>
        </thead>
        <tbody>
          {bicos.map((b) => {
            const litros = b.valor !== null && b.valor_anterior !== null ? b.valor - b.valor_anterior : null
            return (
              <tr key={b.bico_id}>
                <th scope="row" className="fixa">
                  Bico {b.numero}
                  <span className="block text-sm font-semibold text-slate-700">{b.descricao}</span>
                </th>
                <td className="num">
                  {fmtNumero(b.valor, 3)}
                  <span className="block text-sm text-slate-700">{tempoDesde(b.lido_em)}</span>
                </td>
                <td className="num text-slate-800">{fmtNumero(b.valor_anterior, 3)}</td>
                <td className={`calc num ${litros !== null && litros < 0 ? 'bg-red-100 text-red-800' : ''}`}>
                  {litros === null ? '—' : fmtNumero(litros, 3)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </MolduraPlanilha>
  )
}
