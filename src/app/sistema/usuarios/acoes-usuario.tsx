'use client'

import { useState, useTransition } from 'react'
import { Aviso } from '@/components/sistema/ui'
import { alterarAtivo, redefinirSenha } from './acoes'
import { SenhaGerada } from './senha-gerada'

export function AcoesUsuario({ id, ativo, proprio }: { id: string; ativo: boolean; proprio: boolean }) {
  const [senha, setSenha] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, iniciar] = useTransition()

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={enviando}
          className="botao-secundario min-h-10 px-3 text-sm"
          onClick={() => {
            if (!window.confirm('Gerar uma nova senha para este usuário? A senha atual deixará de funcionar.')) return
            setErro(null)
            iniciar(async () => {
              const r = await redefinirSenha(id)
              if (r.ok && r.dados) setSenha(r.dados.senha)
              else setErro(r.mensagem)
            })
          }}
        >
          Redefinir senha
        </button>
        {!proprio ? (
          <button
            type="button"
            disabled={enviando}
            className={`min-h-10 rounded-xl px-3 text-sm font-bold ${ativo ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}
            onClick={() => {
              if (ativo && !window.confirm('Desativar este usuário? Ele perde o acesso imediatamente.')) return
              setErro(null)
              iniciar(async () => {
                const r = await alterarAtivo(id, !ativo)
                if (!r.ok) setErro(r.mensagem)
              })
            }}
          >
            {ativo ? 'Desativar' : 'Reativar'}
          </button>
        ) : null}
      </div>
      {senha ? <SenhaGerada senha={senha} /> : null}
      {erro ? (
        <Aviso tipo="erro" className="mt-2">
          {erro}
        </Aviso>
      ) : null}
    </div>
  )
}
