'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CampoNumero } from '@/components/sistema/campo-numero'
import { Aviso } from '@/components/sistema/ui'
import { fmtNumero, tempoDesde } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import type { EncerranteAtual } from '@/lib/tipos'
import { registrarEncerrantes } from '../acoes'

export function FormEncerrantes({ postoId, bicos }: { postoId: string; bicos: EncerranteAtual[] }) {
  const router = useRouter()
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [salvando, iniciar] = useTransition()

  const preenchidos = bicos.filter((b) => lerNumero(valores[b.bico_id]) !== null)
  const comErro = bicos.some((b) => Number.isNaN(lerNumero(valores[b.bico_id])))

  function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    setSucesso(null)
    if (comErro) return setErro('Corrija os campos marcados em vermelho.')
    if (!preenchidos.length) return setErro('Informe a leitura de ao menos um bico.')

    const menores = preenchidos.filter((b) => b.valor !== null && (lerNumero(valores[b.bico_id]) ?? 0) < b.valor)
    if (
      menores.length &&
      !window.confirm(
        `A leitura de ${menores.map((b) => `bico ${b.numero}`).join(', ')} está MENOR que a anterior. Salvar mesmo assim?`,
      )
    ) {
      return
    }

    iniciar(async () => {
      const resultado = await registrarEncerrantes({
        postoId,
        observacao,
        itens: preenchidos.map((b) => ({ bico_id: b.bico_id, valor: lerNumero(valores[b.bico_id]) as number })),
      })
      if (!resultado.ok) return setErro(resultado.mensagem)
      setValores({})
      setObservacao('')
      setSucesso(`${preenchidos.length} leitura(s) salvas.`)
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  return (
    <form onSubmit={salvar} noValidate className="pb-28 md:pb-0">
      {sucesso ? (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold">✓ {sucesso}</p>
          <Link href="/sistema/fechamento" className="botao-primario min-h-11 text-sm">
            Ir para o fechamento de turno
          </Link>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bicos.map((b) => {
          const atual = lerNumero(valores[b.bico_id])
          const delta = atual !== null && !Number.isNaN(atual) && b.valor !== null ? atual - b.valor : null
          return (
            <li key={b.bico_id} className="cartao p-4">
              <CampoNumero
                rotulo={`Bico ${b.numero} · ${b.descricao}`}
                unidade="L"
                casas={3}
                valor={valores[b.bico_id] ?? ''}
                aoMudar={(v) => setValores((atual) => ({ ...atual, [b.bico_id]: v }))}
                dica={
                  delta !== null ? (
                    delta < 0 ? (
                      <span className="font-bold text-red-700">Menor que a anterior ({fmtNumero(delta, 3)} L)</span>
                    ) : (
                      <span className="font-bold text-emerald-700">+{fmtNumero(delta, 3)} L desde a última</span>
                    )
                  ) : b.valor !== null ? (
                    <span className="text-slate-500">
                      Última: {fmtNumero(b.valor, 3)} ({tempoDesde(b.lido_em)})
                    </span>
                  ) : (
                    <span className="text-slate-400">Sem leitura anterior</span>
                  )
                }
              />
            </li>
          )
        })}
      </ul>

      <div className="cartao mt-4 p-4">
        <label htmlFor="obs-encerrantes" className="rotulo">
          Observação (opcional)
        </label>
        <input
          id="obs-encerrantes"
          className="campo"
          maxLength={1000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: bico 4 em manutenção"
        />
      </div>

      {erro ? (
        <Aviso tipo="erro" className="mt-4">
          {erro}
        </Aviso>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:rounded-2xl md:border md:p-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <p className="flex-1 text-sm font-semibold text-slate-600">
            {preenchidos.length} de {bicos.length} bicos
          </p>
          <button type="submit" className="botao-primario flex-1" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar leituras'}
          </button>
        </div>
      </div>
    </form>
  )
}
