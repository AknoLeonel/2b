import { NextResponse, type NextRequest } from 'next/server'
import { supabaseConfigurado } from '@/lib/env'
import { criarClienteServidor } from '@/lib/supabase/server'

async function sair(request: NextRequest) {
  if (supabaseConfigurado) {
    const supabase = await criarClienteServidor()
    await supabase.auth.signOut()
  }
  const motivo = request.nextUrl.searchParams.get('motivo')
  const destino = new URL('/login', request.url)
  if (motivo === 'inativo') destino.searchParams.set('erro', 'inativo')
  return NextResponse.redirect(destino, { status: 303 })
}

// POST: botão "Sair". GET: usado apenas no redirecionamento de usuário sem perfil ativo.
export const POST = sair
export const GET = sair
