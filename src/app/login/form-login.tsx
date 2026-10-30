'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { emailDoUsuario } from '@/lib/env'
import { usernamePorPosto } from '@/lib/rede'
import { criarClienteNavegador } from '@/lib/supabase/client'

type PerfilLogin = 'caixa' | 'gerente' | 'gestor'

const PERFIS: { valor: PerfilLogin; rotulo: string; dica: string }[] = [
  { valor: 'caixa', rotulo: 'Caixa / Pista', dica: 'Lançamento de encerrantes e fechamento de turno' },
  { valor: 'gerente', rotulo: 'Gerente', dica: 'Estoque, histórico e empréstimos do posto' },
  { valor: 'gestor', rotulo: 'Gestor', dica: 'Painel da rede e administração (também para logins personalizados)' },
]

const CHAVE_PREFERENCIA = 'postos2b:login'

export function FormLogin({
  postos,
  destino,
  erroInicial,
}: {
  postos: { slug: string; nome: string }[]
  destino: string
  erroInicial: string | null
}) {
  const router = useRouter()
  const [perfil, setPerfil] = useState<PerfilLogin>('caixa')
  const [posto, setPosto] = useState(postos[0]?.slug ?? '')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(erroInicial)
  const [enviando, setEnviando] = useState(false)

  // Lembra o último perfil/posto usado neste aparelho (nunca a senha).
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PREFERENCIA) ?? 'null')
      if (salvo?.perfil && PERFIS.some((p) => p.valor === salvo.perfil)) setPerfil(salvo.perfil)
      if (salvo?.posto && postos.some((p) => p.slug === salvo.posto)) setPosto(salvo.posto)
      if (typeof salvo?.usuario === 'string') setUsuario(salvo.usuario)
    } catch {
      // armazenamento indisponível (aba anônima etc.)
    }
  }, [postos])

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)

    const username = perfil === 'gestor' ? usuario.trim().toLowerCase() : usernamePorPosto(perfil, posto)
    if (!username || !/^[a-z0-9]+([.-][a-z0-9]+)*$/.test(username)) {
      setErro('Informe um usuário válido.')
      return
    }
    if (!senha) {
      setErro('Digite a senha.')
      return
    }

    setEnviando(true)
    const supabase = criarClienteNavegador()
    const { error } = await supabase.auth.signInWithPassword({ email: emailDoUsuario(username), password: senha })

    if (error) {
      setEnviando(false)
      setSenha('')
      if (error.status === 429) setErro('Muitas tentativas. Aguarde alguns minutos e tente de novo.')
      else if (error.status === 400 || error.status === 401 || error.code === 'invalid_credentials')
        setErro('Usuário ou senha incorretos.')
      else setErro('Não foi possível entrar agora. Verifique a internet e tente novamente.')
      return
    }

    try {
      localStorage.setItem(
        CHAVE_PREFERENCIA,
        JSON.stringify({ perfil, posto, usuario: perfil === 'gestor' ? username : '' }),
      )
    } catch {
      // ignora
    }
    router.replace(destino)
    router.refresh()
  }

  return (
    <form onSubmit={entrar} className="mt-6 space-y-5" noValidate>
      <fieldset>
        <legend className="rotulo">Quem é você?</legend>
        <div className="grid gap-2">
          {PERFIS.map((p) => (
            <label
              key={p.valor}
              className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-marca ${
                perfil === p.valor ? 'border-marca bg-marca-clara' : 'border-slate-400 bg-white hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                name="perfil"
                value={p.valor}
                checked={perfil === p.valor}
                onChange={() => setPerfil(p.valor)}
                className="size-6 shrink-0 accent-marca"
              />
              <span>
                <span className="block text-lg font-extrabold text-tinta">{p.rotulo}</span>
                <span className="block text-base text-slate-700">{p.dica}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {perfil === 'gestor' ? (
        <div>
          <label htmlFor="usuario" className="rotulo">
            Usuário
          </label>
          <input
            id="usuario"
            name="username"
            className="campo"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ex.: zico"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </div>
      ) : (
        <div>
          <label htmlFor="posto" className="rotulo">
            Posto
          </label>
          <select id="posto" className="campo" value={posto} onChange={(e) => setPosto(e.target.value)} required>
            {postos.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nome}
              </option>
            ))}
          </select>
          {/* ajuda gerenciadores de senha a separar as contas de cada posto */}
          <input type="hidden" name="username" autoComplete="username" value={usernamePorPosto(perfil, posto)} />
        </div>
      )}

      <div>
        <label htmlFor="senha" className="rotulo">
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            name="password"
            type={mostrarSenha ? 'text' : 'password'}
            className="campo pr-20"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute inset-y-0 right-1 my-1 rounded-lg px-3 text-base font-bold text-slate-800 hover:bg-slate-100"
            aria-pressed={mostrarSenha}
          >
            {mostrarSenha ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      <div aria-live="assertive" className="min-h-0">
        {erro ? (
          <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-lg font-bold text-red-800">
            {erro}
          </p>
        ) : null}
      </div>

      <button type="submit" className="botao-primario min-h-16 w-full text-xl" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
