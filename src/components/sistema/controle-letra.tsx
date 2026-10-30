'use client'

import { useEffect, useState } from 'react'

const CHAVE = 'postos2b:letra'
const NIVEIS = ['0', '1', '2'] as const

function aplicar(nivel: string) {
  if (nivel === '0') delete document.documentElement.dataset.letra
  else document.documentElement.dataset.letra = nivel
}

/** Botões A− / A+ para aumentar a letra de todo o sistema (fica salvo no aparelho). */
export function ControleLetra() {
  const [nivel, setNivel] = useState('0')

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE)
      if (salvo && NIVEIS.includes(salvo as (typeof NIVEIS)[number])) {
        setNivel(salvo)
        aplicar(salvo)
      }
    } catch {
      // armazenamento indisponível
    }
  }, [])

  function mudar(delta: number) {
    const novo = String(Math.min(2, Math.max(0, Number(nivel) + delta)))
    setNivel(novo)
    aplicar(novo)
    try {
      localStorage.setItem(CHAVE, novo)
    } catch {
      // ignora
    }
  }

  const botao =
    'flex size-11 items-center justify-center rounded-lg bg-white/15 font-black text-white hover:bg-white/25 disabled:opacity-40'
  return (
    <div role="group" aria-label="Tamanho da letra" className="flex items-center gap-1">
      <button
        type="button"
        className={`${botao} text-base`}
        onClick={() => mudar(-1)}
        disabled={nivel === '0'}
        aria-label="Diminuir letra"
      >
        A−
      </button>
      <button
        type="button"
        className={`${botao} text-xl`}
        onClick={() => mudar(1)}
        disabled={nivel === '2'}
        aria-label="Aumentar letra"
      >
        A+
      </button>
    </div>
  )
}
