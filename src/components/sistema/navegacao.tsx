'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, ClipboardPen, History, LayoutDashboard, UserRound, Users } from 'lucide-react'

const ICONES = {
  painel: LayoutDashboard,
  lancar: ClipboardPen,
  emprestimos: ArrowLeftRight,
  historico: History,
  usuarios: Users,
  conta: UserRound,
}

export type ItemNav = { href: string; rotulo: string; icone: keyof typeof ICONES }

function ativo(pathname: string, href: string) {
  return href === '/sistema'
    ? pathname === '/sistema' || pathname.startsWith('/sistema/postos')
    : pathname.startsWith(href)
}

export function NavegacaoSuperior({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Sistema" className="hidden items-center gap-1 md:flex">
      {itens.map((item) => {
        const Icone = ICONES[item.icone]
        const atual = ativo(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={atual ? 'page' : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              atual ? 'bg-white text-marca' : 'text-white hover:bg-white/15'
            }`}
          >
            <Icone aria-hidden="true" className="size-4" />
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}

export function NavegacaoInferior({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Sistema (celular)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,.06)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
        {itens.map((item) => {
          const Icone = ICONES[item.icone]
          const atual = ativo(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  atual ? 'text-marca' : 'text-slate-500'
                }`}
              >
                <span className={`rounded-full px-4 py-1 ${atual ? 'bg-marca-clara' : ''}`}>
                  <Icone aria-hidden="true" className="size-5" />
                </span>
                {item.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
