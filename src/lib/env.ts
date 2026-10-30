// Variáveis públicas precisam ser lidas literalmente (process.env.NEXT_PUBLIC_*)
// para que o Next.js as injete no bundle do navegador.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const SUPABASE_CHAVE_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_CHAVE_PUBLICA)

export const DOMINIO_LOGIN = (process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN || 'postos2b.internal').trim().toLowerCase()

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'http://localhost:3000'
).replace(/\/+$/, '')

export const CONTATO = {
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_CONTATO ?? '').replace(/\D/g, ''),
  email: process.env.NEXT_PUBLIC_EMAIL_CONTATO ?? '',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? '',
}

export const FUSO = 'America/Sao_Paulo'

export function emailDoUsuario(username: string) {
  return `${username.trim().toLowerCase()}@${DOMINIO_LOGIN}`
}
