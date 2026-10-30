import type { Metadata } from 'next'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { MarcaLogo } from '@/components/logo'
import { NavegacaoInferior, NavegacaoSuperior, type ItemNav } from '@/components/sistema/navegacao'
import { exigirSessao } from '@/lib/auth'
import { pode, ROTULO_PAPEL } from '@/lib/permissoes'

export const metadata: Metadata = {
  title: { default: 'Sistema interno', template: '%s · Sistema 2B' },
  robots: { index: false, follow: false },
}

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const { perfil, postos } = await exigirSessao()

  const itens: ItemNav[] = [{ href: '/sistema', rotulo: 'Painel', icone: 'painel' }]
  if (pode.fechamento(perfil) || pode.encerrantes(perfil))
    itens.push({ href: '/sistema/lancar', rotulo: 'Lançar', icone: 'lancar' })
  if (pode.emprestimos(perfil))
    itens.push({ href: '/sistema/emprestimos', rotulo: 'Empréstimos', icone: 'emprestimos' })
  itens.push({ href: '/sistema/historico', rotulo: 'Histórico', icone: 'historico' })
  if (pode.usuarios(perfil)) itens.push({ href: '/sistema/usuarios', rotulo: 'Usuários', icone: 'usuarios' })
  itens.push({ href: '/sistema/conta', rotulo: 'Conta', icone: 'conta' })

  const escopo =
    perfil.papel === 'gestor'
      ? perfil.acesso_total
        ? 'Toda a rede'
        : `${postos.length} posto(s)`
      : (postos[0]?.nome ?? '')

  return (
    <div className="min-h-dvh bg-fundo pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b-4 border-destaque bg-marca text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/sistema" className="flex min-w-0 items-center gap-2.5" aria-label="Painel">
            <MarcaLogo className="size-9 shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold">{perfil.nome}</span>
              <span className="block truncate text-xs text-red-100">
                {ROTULO_PAPEL[perfil.papel]} · {escopo}
              </span>
            </span>
          </Link>
          <NavegacaoSuperior itens={itens} />
          <form action="/auth/sair" method="post">
            <button
              type="submit"
              className="flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-bold text-marca shadow-sm hover:bg-red-50"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 md:py-8">{children}</main>
      <NavegacaoInferior itens={itens} />
    </div>
  )
}
