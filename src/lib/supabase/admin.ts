import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '../env'

/**
 * Cliente com a chave secreta (ignora o RLS). Use SOMENTE no servidor e
 * somente depois de confirmar que quem pediu é um gestor com acesso total.
 */
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !chave) return null
  return createClient(SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
