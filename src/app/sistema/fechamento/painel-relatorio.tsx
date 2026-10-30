'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function PainelRelatorio({ texto, aoNovo }: { texto: string; aoNovo: () => void }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="cartao flex items-center gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        role="status"
      >
        <CheckCircle2 aria-hidden="true" className="size-8 shrink-0" />
        <div>
          <p className="text-lg font-extrabold">Fechamento salvo!</p>
          <p className="text-sm">Agora envie o relatório no grupo do WhatsApp.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener"
          className="botao-whatsapp"
        >
          Enviar no WhatsApp
        </a>
        <button type="button" onClick={copiar} className="botao-secundario">
          {copiado ? 'Copiado ✓' : 'Copiar relatório'}
        </button>
        <button type="button" onClick={aoNovo} className="botao-escuro">
          Novo fechamento
        </button>
      </div>

      <pre className="cartao overflow-x-auto whitespace-pre-wrap p-4 font-sans text-sm text-slate-800">{texto}</pre>
    </div>
  )
}
