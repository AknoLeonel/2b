import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL, supabaseConfigurado } from '@/lib/env'

// Renova a sessão do Supabase e protege a área interna.
// Roda apenas em /sistema e /login: o site público continua estático.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!supabaseConfigurado) {
    if (pathname.startsWith('/sistema')) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([chave, valor]) => response.headers.set(chave, valor))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const logado = Boolean(data?.claims?.sub)

  if (!logado && pathname.startsWith('/sistema')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    if (pathname !== '/sistema') url.searchParams.set('voltar', pathname)
    return NextResponse.redirect(url)
  }

  if (logado && pathname === '/login') {
    return NextResponse.redirect(new URL('/sistema', request.url))
  }

  return response
}

export const config = {
  matcher: ['/sistema/:path*', '/login'],
}
