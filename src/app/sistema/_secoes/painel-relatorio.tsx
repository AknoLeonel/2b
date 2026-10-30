'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function PainelRelatorio({ texto, aoNovo }: { texto: string; aoNovo: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const titulo = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    titulo.current?.focus()
  }, [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-5 text-emerald-950"
        role="status"
      >
        <CheckCircle2 aria-hidden="true" className="size-12 shrink-0 text-emerald-700" />
        <div>
          <p ref={titulo} tabIndex={-1} className="text-2xl font-extrabold focus:outline-none">
            Planilha salva!
          </p>
          <p className="text-lg">Agora toque no botão verde para mandar o relatório no grupo do WhatsApp.</p>
        </div>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener"
        className="botao-whatsapp min-h-16 w-full text-xl"
      >
        Enviar no WhatsApp
      </a>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={copiar} className="botao-secundario">
          {copiado ? 'Copiado ✓' : 'Copiar o texto do relatório'}
        </button>
        <button type="button" onClick={aoNovo} className="botao-secundario">
          Começar novo fechamento
        </button>
      </div>

      <details className="rounded-2xl border border-slate-300 bg-white p-4">
        <summary className="cursor-pointer text-lg font-bold text-slate-800">Ver o texto do relatório</summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-sans text-base text-slate-900">{texto}</pre>
      </details>
    </div>
  )
}
