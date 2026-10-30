'use client'

import { useState, useTransition } from 'react'
import { MolduraPlanilha } from '@/components/sistema/planilha'
import { aoTeclarNaPlanilha } from '@/components/sistema/teclado-planilha'
import { Aviso } from '@/components/sistema/ui'
import { fmtNumero, fmtPct, tempoDesde } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import type { EstoqueAtual } from '@/lib/tipos'
import { registrarAtualizacao } from '../acoes'

/** Atualização rápida: só a régua de cada tanque, fora do fechamento. */
export function TabelaAtualizacao({ postoId, tanques }: { postoId: string; tanques: EstoqueAtual[] }) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null)
  const [salvando, iniciar] = useTransition()

  function salvar() {
    setMensagem(null)
    const itens = tanques
      .map((t) => ({ produto: t.produto_codigo, regua: lerNumero(valores[t.produto_codigo]) }))
      .filter((i) => i.regua !== null)
    if (itens.some((i) => Number.isNaN(i.regua)))
      return setMensagem({ ok: false, texto: 'Há número inválido. Corrija a célula marcada "número inválido".' })
    if (!itens.length) return setMensagem({ ok: false, texto: 'Digite a régua de pelo menos um tanque.' })

    iniciar(async () => {
      const r = await registrarAtualizacao({ postoId, itens, observacao })
      setMensagem({ ok: r.ok, texto: r.ok ? '✓ Estoque atualizado.' : r.mensagem })
      if (r.ok) {
        setValores({})
        setObservacao('')
      }
    })
  }

  return (
    <div className="space-y-4">
      <MolduraPlanilha rotulo="Planilha de atualização rápida">
        <table className="planilha min-w-[40rem]">
          <caption className="sr-only">Atualização rápida de estoque</caption>
          <thead>
            <tr>
              <th scope="col" className="fixa text-left">
                Produto
              </th>
              <th scope="col">Capacidade</th>
              <th scope="col" className="calc">
                Estoque atual
              </th>
              <th scope="col" className="text-marca">
                Nova régua
              </th>
              <th scope="col" className="calc">
                Nível novo
              </th>
            </tr>
          </thead>
          <tbody>
            {tanques.map((t, i) => {
              const novo = lerNumero(valores[t.produto_codigo])
              const invalido = Number.isNaN(novo)
              const pct = novo !== null && !invalido && t.capacidade > 0 ? (novo / t.capacidade) * 100 : null
              return (
                <tr key={t.tanque_id}>
                  <th scope="row" className="fixa">
                    {t.produto_nome}
                  </th>
                  <td className="num">{t.capacidade > 0 ? `${fmtNumero(t.capacidade)} ${t.unidade}` : '—'}</td>
                  <td className="calc num">
                    {t.estoque === null ? '—' : `${fmtNumero(t.estoque)} ${t.unidade}`}
                    <span className="block text-sm font-semibold text-slate-700">{tempoDesde(t.medido_em)}</span>
                  </td>
                  <td className={`entrada ${invalido ? 'invalida' : ''}`}>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      enterKeyHint="next"
                      data-lin={i}
                      data-col="regua"
                      aria-label={`${t.produto_nome}, nova régua`}
                      aria-invalid={invalido || undefined}
                      aria-describedby={invalido ? `erro-regua-${t.tanque_id}` : undefined}
                      value={valores[t.produto_codigo] ?? ''}
                      onChange={(e) => setValores((a) => ({ ...a, [t.produto_codigo]: e.target.value }))}
                      onKeyDown={aoTeclarNaPlanilha}
                    />
                    {invalido ? (
                      <span
                        id={`erro-regua-${t.tanque_id}`}
                        className="block px-3 pb-1 text-right text-sm font-bold text-red-800"
                      >
                        número inválido
                      </span>
                    ) : null}
                  </td>
                  <td className={`calc num ${pct !== null && pct > 100 ? 'bg-amber-100 text-amber-950' : ''}`}>
                    {pct === null ? '—' : `${fmtPct(pct)}${pct > 100 ? ' ⚠' : ''}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </MolduraPlanilha>
      <div>
        <label htmlFor={`obs-atualizacao-${postoId}`} className="rotulo">
          Observação (se precisar)
        </label>
        <input
          id={`obs-atualizacao-${postoId}`}
          className="campo"
          maxLength={1000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      {mensagem ? (
        <Aviso tipo={mensagem.ok ? 'sucesso' : 'erro'} className="text-base">
          {mensagem.texto}
        </Aviso>
      ) : null}
      <button type="button" className="botao-primario w-full sm:w-auto" disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando…' : 'Salvar atualização'}
      </button>
    </div>
  )
}
