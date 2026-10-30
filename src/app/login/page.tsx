import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { supabaseConfigurado } from '@/lib/env'
import { listarPostosPublicos } from '@/lib/site'
import { FormLogin } from './form-login'

export const metadata: Metadata = {
  title: 'Acesso restrito',
  robots: { index: false, follow: false },
}

function destinoSeguro(voltar: string | string[] | undefined) {
  const v = Array.isArray(voltar) ? voltar[0] : voltar
  return v && v.startsWith('/sistema') && !v.startsWith('//') ? v : '/sistema'
}

export default async function PaginaLogin({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const postos = await listarPostosPublicos()
  const erro = params.erro === 'inativo' ? 'Seu acesso está desativado. Fale com a gestão da rede.' : null

  return (
    <main className="flex min-h-dvh flex-col bg-fundo">
      <header className="border-b-4 border-destaque bg-marca px-4 py-3 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" aria-label="Voltar ao site">
            <Logo claro subtitulo="Sistema interno" />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-3xl font-extrabold text-tinta">Entrar no sistema</h1>
        <p className="mt-1 text-lg text-slate-700">Escolha quem é você, o posto e digite a senha.</p>

        {!supabaseConfigurado ? (
          <p role="alert" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            O banco de dados ainda não foi configurado. Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> nas variáveis de ambiente (veja o README).
          </p>
        ) : (
          <FormLogin
            postos={postos.map((p) => ({ slug: p.slug, nome: p.nome }))}
            destino={destinoSeguro(params.voltar)}
            erroInicial={erro}
          />
        )}

        <p className="mt-8 text-center text-base text-slate-700">
          Esqueceu a senha? Peça a um gestor para redefinir em <strong>Usuários</strong>.
        </p>
      </div>
    </main>
  )
}
