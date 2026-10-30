'use client'

import { useRef, useState, useTransition } from 'react'
import { CampoNumero } from '@/components/sistema/campo-numero'
import { Aviso } from '@/components/sistema/ui'
import { fmtVolume } from '@/lib/formato'
import { lerNumero } from '@/lib/numero'
import type { Emprestimo } from '@/lib/tipos'
import { cancelarEmprestimo, quitarEmprestimo, registrarDevolucao } from '../acoes'

type Modo = 'devolucao' | 'quitar' | 'cancelar'

const TITULOS: Record<Modo, string> = {
  devolucao: 'Registrar devolução parcial',
  quitar: 'Quitar empréstimo',
  cancelar: 'Cancelar empréstimo',
}

export function AcoesEmprestimo({ emprestimo, podeCancelar }: { emprestimo: Emprestimo; podeCancelar: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [modo, setModo] = useState<Modo>('devolucao')
  const [volume, setVolume] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  function abrir(m: Modo) {
    setModo(m)
    setVolume('')
    setTexto('')
    setErro(null)
    dialogo.current?.showModal()
  }

  function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    iniciar(async () => {
      let r
      if (modo === 'devolucao') {
        const litros = lerNumero(volume)
        if (!litros || Number.isNaN(litros) || litros <= 0) return setErro('Informe o volume devolvido.')
        if (litros > emprestimo.saldo) return setErro(`O saldo pendente é ${fmtVolume(emprestimo.saldo)}.`)
        r = await registrarDevolucao({ id: emprestimo.id, volume: litros, observacao: texto })
      } else if (modo === 'quitar') {
        r = await quitarEmprestimo({ id: emprestimo.id, observacao: texto })
      } else {
        r = await cancelarEmprestimo({ id: emprestimo.id, motivo: texto })
      }
      if (!r.ok) return setErro(r.mensagem)
      dialogo.current?.close()
    })
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => abrir('devolucao')}
          className="botao-secundario min-h-11 flex-1 px-3 text-sm"
        >
          Devolução parcial
        </button>
        <button
          type="button"
          onClick={() => abrir('quitar')}
          className="botao min-h-11 flex-1 bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700"
        >
          Quitar
        </button>
        {podeCancelar ? (
          <button
            type="button"
            onClick={() => abrir('cancelar')}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      <dialog
        ref={dialogo}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-black/60"
        aria-labelledby={`dlg-${emprestimo.id}`}
      >
        <form onSubmit={confirmar} className="space-y-4 p-5">
          <div>
            <h3 id={`dlg-${emprestimo.id}`} className="text-lg font-extrabold text-tinta">
              {TITULOS[modo]}
            </h3>
            <p className="text-sm text-slate-600">
              {emprestimo.produto_nome}: {emprestimo.origem_nome} → {emprestimo.destino_nome}. Saldo{' '}
              <strong>{fmtVolume(emprestimo.saldo)}</strong>.
            </p>
          </div>

          {modo === 'devolucao' ? (
            <CampoNumero rotulo="Litros devolvidos agora" valor={volume} aoMudar={setVolume} autoFocus />
          ) : null}

          <div>
            <label htmlFor={`txt-${emprestimo.id}`} className="rotulo">
              {modo === 'cancelar' ? 'Motivo do cancelamento (obrigatório)' : 'Observação (opcional)'}
            </label>
            <input
              id={`txt-${emprestimo.id}`}
              className="campo"
              maxLength={500}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              required={modo === 'cancelar'}
            />
          </div>

          {modo === 'quitar' ? (
            <Aviso tipo="atencao">
              Confirma que os {fmtVolume(emprestimo.saldo)} restantes foram devolvidos ao {emprestimo.origem_nome}?
            </Aviso>
          ) : null}
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

          <div className="flex gap-2">
            <button type="button" onClick={() => dialogo.current?.close()} className="botao-secundario flex-1">
              Voltar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className={`flex-1 ${modo === 'cancelar' ? 'botao bg-red-700 text-white hover:bg-red-800' : 'botao-primario'}`}
            >
              {enviando ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
