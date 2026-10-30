import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '../env'

/** Cliente com a sessão do usuário (cookies). Todas as consultas passam pelo RLS. */
export async function criarClienteServidor() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Chamado a partir de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  })
}
