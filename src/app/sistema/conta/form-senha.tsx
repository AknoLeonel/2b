'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Aviso } from '@/components/sistema/ui'
import { alterarSenha } from '../acoes'

function BotaoSalvar() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="botao-primario w-full sm:w-auto" disabled={pending}>
      {pending ? 'Salvando…' : 'Alterar senha'}
    </button>
  )
}

export function FormSenha() {
  const [estado, acao] = useActionState(alterarSenha, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (estado?.ok) form.current?.reset()
  }, [estado])

  return (
    <form ref={form} action={acao} className="mt-4 space-y-4">
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <div>
        <label htmlFor="senha-atual" className="rotulo">
          Senha atual
        </label>
        <input
          id="senha-atual"
          name="atual"
          type="password"
          autoComplete="current-password"
          className="campo"
          required
        />
      </div>
      <div>
        <label htmlFor="senha-nova" className="rotulo">
          Nova senha
        </label>
        <input
          id="senha-nova"
          name="nova"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          className="campo"
          required
        />
      </div>
      <div>
        <label htmlFor="senha-confirmacao" className="rotulo">
          Confirmar nova senha
        </label>
        <input
          id="senha-confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          className="campo"
          required
        />
      </div>
      {estado ? <Aviso tipo={estado.ok ? 'sucesso' : 'erro'}>{estado.mensagem}</Aviso> : null}
      <BotaoSalvar />
    </form>
  )
}
