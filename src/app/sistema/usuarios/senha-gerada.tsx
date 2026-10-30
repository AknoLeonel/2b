'use client'

import { useState } from 'react'

export function SenhaGerada({ usuario, senha }: { usuario?: string; senha: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div
      className="mt-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-950"
      role="status"
    >
      <p className="font-bold">Anote e entregue pessoalmente. Esta senha não será mostrada de novo.</p>
      {usuario ? (
        <p className="mt-1">
          Usuário: <span className="font-mono font-bold">{usuario}</span>
        </p>
      ) : null}
      <p className="mt-1 flex flex-wrap items-center gap-2">
        Senha: <span className="select-all rounded bg-white px-2 py-1 font-mono text-base font-bold">{senha}</span>
        <button
          type="button"
          className="rounded-lg bg-white px-2 py-1 text-xs font-bold ring-1 ring-amber-300"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(senha)
              setCopiado(true)
            } catch {
              setCopiado(false)
            }
          }}
        >
          {copiado ? 'Copiada ✓' : 'Copiar'}
        </button>
      </p>
    </div>
  )
}
