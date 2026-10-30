import Link from 'next/link'
import { Logo } from '@/components/logo'
import { CONTATO } from '@/lib/env'
import { linkWhatsapp } from '@/lib/site'

const LINKS = [
  { href: '/#postos', rotulo: 'Postos' },
  { href: '/#combustiveis', rotulo: 'Combustíveis' },
  { href: '/#frotas', rotulo: 'Frotas' },
  { href: '/#duvidas', rotulo: 'Dúvidas' },
  { href: '/#contato', rotulo: 'Contato' },
]

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const whatsapp = linkWhatsapp(CONTATO.whatsapp)
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b-4 border-destaque bg-marca text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="Postos 2B — página inicial">
            <Logo claro subtitulo="Rede de postos de combustível" />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/15">
                {l.rotulo}
              </a>
            ))}
            <Link
              href="/login"
              className="ml-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-marca shadow-sm hover:bg-red-50"
            >
              Área interna
            </Link>
          </nav>
          <details className="group relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-white/15 px-3 font-semibold [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-xl leading-none">
                ☰
              </span>
              Menu
            </summary>
            <nav
              aria-label="Principal (celular)"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white py-2 text-slate-800 shadow-xl ring-1 ring-black/5"
            >
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="block px-4 py-3 font-semibold hover:bg-slate-50">
                  {l.rotulo}
                </a>
              ))}
              <Link
                href="/login"
                className="mx-2 mt-1 block rounded-lg bg-marca px-4 py-3 text-center font-bold text-white"
              >
                Área interna
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <div id="conteudo">{children}</div>

      <footer className="border-t-4 border-destaque bg-tinta text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <Logo claro />
            <p className="mt-3 text-sm">Combustível com procedência e atendimento de confiança em toda a rede.</p>
          </div>
          <nav aria-label="Rodapé" className="text-sm">
            <p className="mb-2 font-bold text-white">Navegação</p>
            <ul className="space-y-1.5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="hover:text-white hover:underline">
                    {l.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="text-sm">
            <p className="mb-2 font-bold text-white">Fale com a gente</p>
            <ul className="space-y-1.5">
              {whatsapp ? (
                <li>
                  <a href={whatsapp} className="hover:text-white hover:underline" rel="noopener" target="_blank">
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {CONTATO.email ? (
                <li>
                  <a href={`mailto:${CONTATO.email}`} className="hover:text-white hover:underline">
                    {CONTATO.email}
                  </a>
                </li>
              ) : null}
              {CONTATO.instagram ? (
                <li>
                  <a
                    href={CONTATO.instagram}
                    className="hover:text-white hover:underline"
                    rel="noopener"
                    target="_blank"
                  >
                    Instagram
                  </a>
                </li>
              ) : null}
              <li>
                <Link href="/login" className="hover:text-white hover:underline">
                  Área interna (colaboradores)
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Rede de Postos 2B. Todos os direitos reservados.
        </p>
      </footer>
    </>
  )
}
