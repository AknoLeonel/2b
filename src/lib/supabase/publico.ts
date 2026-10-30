import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, supabaseConfigurado } from '../env'

/** Cliente anônimo, sem sessão — usado nas páginas públicas (pré-renderizadas). */
export function criarClientePublico() {
  if (!supabaseConfigurado) return null
  return createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
