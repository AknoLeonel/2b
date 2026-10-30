import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '../env'

export function criarClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA)
}
