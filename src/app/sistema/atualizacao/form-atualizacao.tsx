'use client'

import { useState, useTransition } from 'react'
import { CampoNumero } from '@/components/sistema/campo-numero'
import { Aviso } from '@/components/sistema/ui'
import { fmtVolume, tempoDesde } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import type { EstoqueAtual } from '@/lib/tipos'
import { registrarAtualizacao } from '../acoes'

export function FormAtualizacao({ postoId, tanques }: { postoId: string; tanques: EstoqueAtual[] }) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observacao, setObservacao] = useState('')
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null)
  const [salvando, iniciar] = useTransition()

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setMensagem(null)
    const itens = tanques
      .map((t) => ({ produto: t.produto_codigo, regua: lerNumero(valores[t.produto_codigo]) }))
      .filter((i) => i.regua !== null)
    if (itens.some((i) => Number.isNaN(i.regua)))
      return setMensagem({ ok: false, texto: 'Corrija os campos em vermelho.' })
    if (!itens.length) return setMensagem({ ok: false, texto: 'Informe a régua de ao menos um tanque.' })

    iniciar(async () => {
      const r = await registrarAtualizacao({ postoId, itens, observacao })
      setMensagem({ ok: r.ok, texto: r.mensagem })
      if (r.ok) {
        setValores({})
        setObservacao('')
      }
    })
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-4">
      {mensagem ? <Aviso tipo={mensagem.ok ? 'sucesso' : 'erro'}>{mensagem.texto}</Aviso> : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tanques.map((t) => {
          const novo = lerNumero(valores[t.produto_codigo])
          const acima = t.capacidade > 0 && novo !== null && novo > t.capacidade
          return (
            <li key={t.tanque_id} className="cartao p-4">
              <CampoNumero
                rotulo={`${t.produto_nome}${t.capacidade > 0 ? ` (máx. ${fmtVolume(t.capacidade, t.unidade)})` : ''}`}
                unidade={t.unidade}
                valor={valores[t.produto_codigo] ?? ''}
                aoMudar={(v) => setValores((a) => ({ ...a, [t.produto_codigo]: v }))}
                dica={
                  acima ? (
                    <span className="font-bold text-amber-700">Acima da capacidade do tanque</span>
                  ) : (
                    <span className="text-slate-500">
                      Atual: {fmtVolume(t.estoque, t.unidade)} · {tempoDesde(t.medido_em)}
                    </span>
                  )
                }
              />
            </li>
          )
        })}
      </ul>
      <div className="cartao p-4">
        <label htmlFor="obs-atualizacao" className="rotulo">
          Observação (opcional)
        </label>
        <input
          id="obs-atualizacao"
          className="campo"
          maxLength={1000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </div>
      <button type="submit" className="botao-primario w-full sm:w-auto" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar atualização'}
      </button>
    </form>
  )
}
