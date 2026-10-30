import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { supabaseConfigurado } from './env'
import { criarClienteServidor } from './supabase/server'
import type { Perfil, PostoResumo } from './tipos'

export interface Sessao {
  perfil: Perfil
  postos: PostoResumo[]
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>
}

/** Sessão do usuário logado (perfil + postos permitidos) ou null. Memoizada por requisição. */
export const obterSessao = cache(async (): Promise<Sessao | 'sem-perfil' | null> => {
  await connection() // área logada: sempre renderizada por requisição, nunca em cache
  if (!supabaseConfigurado) return null
  const supabase = await criarClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const uid = data?.claims?.sub
  if (!uid) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, username, nome, papel, posto_id, acesso_total, ativo')
    .eq('id', uid)
    .maybeSingle<Perfil>()
  if (!perfil || !perfil.ativo) return 'sem-perfil'

  const { data: todos } = await supabase
    .from('postos')
    .select('id, slug, nome, nome_publico')
    .eq('ativo', true)
    .order('ordem')

  let postos = (todos ?? []) as PostoResumo[]
  if (!perfil.acesso_total) {
    if (perfil.posto_id) {
      postos = postos.filter((p) => p.id === perfil.posto_id)
    } else {
      const { data: vinculos } = await supabase.from('perfil_postos').select('posto_id').eq('perfil_id', perfil.id)
      const permitidos = new Set(((vinculos ?? []) as { posto_id: string }[]).map((v) => v.posto_id))
      postos = postos.filter((p) => permitidos.has(p.id))
    }
  }

  return { perfil, postos, supabase }
})

/** Exige login. Usuário sem perfil ativo é desconectado. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await obterSessao()
  if (sessao === null) redirect('/login')
  if (sessao === 'sem-perfil') redirect('/auth/sair?motivo=inativo')
  return sessao
}

/** Escolhe o posto da tela: o da URL (se permitido) ou o primeiro do usuário. */
export function escolherPosto(sessao: Sessao, slug?: string | string[]) {
  const s = Array.isArray(slug) ? slug[0] : slug
  return sessao.postos.find((p) => p.slug === s) ?? sessao.postos[0] ?? null
}
