'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Aviso } from '@/components/sistema/ui'
import { criarUsuario } from './acoes'
import { SenhaGerada } from './senha-gerada'

function Botao() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="botao-primario w-full" disabled={pending}>
      {pending ? 'Criando…' : 'Criar usuário'}
    </button>
  )
}

export function FormNovoUsuario({ postos }: { postos: { id: string; nome: string }[] }) {
  const [estado, acao] = useActionState(criarUsuario, null)
  const [papel, setPapel] = useState<'gestor' | 'gerente' | 'caixa'>('caixa')
  const [total, setTotal] = useState(true)

  return (
    <section aria-labelledby="titulo-novo" className="cartao h-fit p-5">
      <h2 id="titulo-novo" className="text-lg font-extrabold text-tinta">
        Novo usuário
      </h2>
      <form action={acao} className="mt-4 space-y-4">
        <div>
          <label htmlFor="nu-nome" className="rotulo">
            Nome
          </label>
          <input
            id="nu-nome"
            name="nome"
            className="campo"
            required
            maxLength={80}
            placeholder="Ex.: João (caixa Divisa)"
          />
        </div>
        <div>
          <label htmlFor="nu-papel" className="rotulo">
            Perfil
          </label>
          <select
            id="nu-papel"
            name="papel"
            className="campo"
            value={papel}
            onChange={(e) => setPapel(e.target.value as typeof papel)}
          >
            <option value="caixa">Caixa / Pista</option>
            <option value="gerente">Gerente</option>
            <option value="gestor">Gestor</option>
          </select>
        </div>
        <div>
          <label htmlFor="nu-username" className="rotulo">
            Usuário (login)
          </label>
          <input
            id="nu-username"
            name="username"
            className="campo font-mono"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            pattern="[a-z0-9]+([.\-][a-z0-9]+)*"
            placeholder={papel === 'gestor' ? 'ex.: joao.silva' : 'ex.: caixa-divisa-2'}
          />
          {papel !== 'gestor' ? (
            <p className="mt-1 text-xs text-slate-500">
              O login de pista usa <span className="font-mono">caixa-&lt;posto&gt;</span> e o de gerente{' '}
              <span className="font-mono">gerente-&lt;posto&gt;</span>. Outros nomes entram pela aba “Gestor” do login.
            </p>
          ) : null}
        </div>

        {papel === 'gestor' ? (
          <fieldset className="space-y-2">
            <legend className="rotulo">Postos que pode ver</legend>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                name="acesso_total"
                checked={total}
                onChange={(e) => setTotal(e.target.checked)}
                className="size-5"
              />
              Toda a rede (inclui gerenciar usuários)
            </label>
            {!total ? (
              <div className="grid gap-1.5 rounded-xl bg-slate-50 p-3">
                {postos.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="postos" value={p.id} className="size-5" />
                    {p.nome}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
        ) : (
          <div>
            <label htmlFor="nu-posto" className="rotulo">
              Posto
            </label>
            <select id="nu-posto" name="posto_id" className="campo" required>
              {postos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="nu-senha" className="rotulo">
            Senha inicial (opcional)
          </label>
          <input
            id="nu-senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            className="campo"
            placeholder="Deixe vazio para gerar uma senha forte"
          />
        </div>

        {estado && !estado.ok ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
        {estado?.ok && estado.dados ? (
          <>
            <Aviso tipo="sucesso">{estado.mensagem}</Aviso>
            <SenhaGerada usuario={estado.dados.username} senha={estado.dados.senha} />
          </>
        ) : null}
        <Botao />
      </form>
    </section>
  )
}
