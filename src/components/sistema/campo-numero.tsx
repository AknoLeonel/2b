'use client'

import { useId } from 'react'
import { fmtNumero } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'

export function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  unidade = 'L',
  dica,
  destaque = false,
  casas = 2,
  autoFocus,
}: {
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  unidade?: string
  dica?: React.ReactNode
  destaque?: boolean
  casas?: 2 | 3
  autoFocus?: boolean
}) {
  const id = useId()
  const numero = lerNumero(valor)
  const invalido = Number.isNaN(numero)
  const mostrarInterpretado = numero !== null && !invalido && /[.,]/.test(valor)

  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          className={`campo tabular pr-10 text-right text-lg ${destaque ? 'border-marca/50 bg-marca-clara/40' : ''} ${
            invalido ? 'border-red-500 bg-red-50' : ''
          }`}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={invalido || undefined}
          aria-describedby={dica || invalido ? `${id}-dica` : undefined}
          autoFocus={autoFocus}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-base font-semibold text-slate-600">
          {unidade}
        </span>
      </div>
      <div id={`${id}-dica`} className="mt-1 min-h-5 text-sm">
        {invalido ? (
          <span className="font-semibold text-red-700">Número inválido</span>
        ) : mostrarInterpretado ? (
          <span className="text-slate-700">
            = {fmtNumero(numero, casas)} {unidade}
          </span>
        ) : (
          dica
        )}
      </div>
    </div>
  )
}

/** Valor numérico para preencher um campo de edição (sem separador de milhar). */
export function paraCampo(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return ''
  return String(valor).replace('.', ',')
}
