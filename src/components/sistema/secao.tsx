import Link from 'next/link'

/** Bloco numerado da página (o usuário rola de cima para baixo seguindo os números). */
export function Secao({
  id,
  numero,
  titulo,
  descricao,
  acoes,
  children,
}: {
  id: string
  numero?: number
  titulo: string
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`titulo-${id}`} className="scroll-mt-20 py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          {numero ? (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca text-xl font-black text-white"
            >
              {numero}
            </span>
          ) : null}
          <div>
            <h2 id={`titulo-${id}`} className="text-2xl font-extrabold text-tinta">
              {numero ? <span className="sr-only">{numero}. </span> : null}
              {titulo}
            </h2>
            {descricao ? <p className="mt-1 text-base text-slate-700">{descricao}</p> : null}
          </div>
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
      {children}
    </section>
  )
}

/** Barra fixa com atalhos para as seções da página (rolagem suave, sem trocar de tela). */
export function BarraAtalhos({ itens }: { itens: { id: string; rotulo: string }[] }) {
  return (
    <nav
      aria-label="Ir para"
      className="sticky top-0 z-20 -mx-4 border-b border-slate-300 bg-fundo/95 px-4 py-2 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto pb-0.5">
        {itens.map((item, i) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center gap-2 rounded-full border-2 border-slate-400 bg-white px-4 text-base font-bold text-slate-900 hover:border-marca hover:text-marca"
            >
              <span aria-hidden="true" className="text-marca">
                {i + 1}
              </span>
              {item.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function LinkVoltar({ href = '/sistema', rotulo = 'Voltar para o início' }: { href?: string; rotulo?: string }) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg text-lg font-bold text-marca hover:underline"
    >
      ← {rotulo}
    </Link>
  )
}
