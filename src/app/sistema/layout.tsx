import type { Metadata } from 'next'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { MarcaLogo } from '@/components/logo'
import { ControleLetra } from '@/components/sistema/controle-letra'
import { exigirSessao } from '@/lib/auth'
import { pode, ROTULO_PAPEL } from '@/lib/permissoes'

export const metadata: Metadata = {
  title: { default: 'Sistema interno', template: '%s · Sistema 2B' },
  robots: { index: false, follow: false },
}

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const { perfil, postos } = await exigirSessao()
  const escopo =
    perfil.papel === 'gestor'
      ? perfil.acesso_total
        ? 'Toda a rede'
        : `${postos.length} posto(s)`
      : (postos[0]?.nome ?? '')

  return (
    <div className="min-h-dvh bg-fundo pb-16">
      <header id="topo" className="border-b-4 border-destaque bg-marca text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/sistema" className="flex min-w-0 items-center gap-3" aria-label="Início do sistema">
            <MarcaLogo className="size-11 shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-lg font-extrabold">{perfil.nome}</span>
              <span className="block truncate text-base font-semibold text-white">
                {ROTULO_PAPEL[perfil.papel]} · {escopo}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ControleLetra />
            <form action="/auth/sair" method="post">
              <button
                type="submit"
                className="flex min-h-11 items-center gap-1.5 rounded-lg bg-white px-4 text-base font-bold text-marca shadow-sm hover:bg-red-50"
              >
                <LogOut aria-hidden="true" className="size-5" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">{children}</main>

      <footer className="mx-auto mt-6 flex max-w-6xl flex-wrap gap-x-6 gap-y-2 border-t border-slate-300 px-4 pt-5 text-base">
        <Link href="/sistema" className="font-bold text-slate-800 underline underline-offset-4">
          Início
        </Link>
        <Link href="/sistema/conta" className="font-bold text-slate-800 underline underline-offset-4">
          Minha senha
        </Link>
        {pode.usuarios(perfil) ? (
          <Link href="/sistema/usuarios" className="font-bold text-slate-800 underline underline-offset-4">
            Usuários
          </Link>
        ) : null}
        <a href="#topo" className="ml-auto font-bold text-marca underline underline-offset-4">
          ↑ Voltar ao topo
        </a>
      </footer>
    </div>
  )
}
