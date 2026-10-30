import Link from 'next/link'

export function TituloPagina({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: string
  descricao?: React.ReactNode
  acoes?: React.ReactNode
  voltar?: { href: string; rotulo: string }
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {voltar ? (
          <Link
            href={voltar.href}
            className="mb-2 inline-flex min-h-11 items-center text-lg font-bold text-marca hover:underline"
          >
            ← {voltar.rotulo}
          </Link>
        ) : null}
        <h1 className="text-2xl font-extrabold text-tinta sm:text-3xl">{titulo}</h1>
        {descricao ? <p className="mt-1 text-base text-slate-700">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </div>
  )
}

const ESTILOS_AVISO = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  atencao: 'border-amber-300 bg-amber-50 text-amber-900',
  erro: 'border-red-200 bg-red-50 text-red-800',
}

export function Aviso({
  tipo = 'info',
  children,
  className = '',
}: {
  tipo?: keyof typeof ESTILOS_AVISO
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-xl border-2 p-3 text-base font-semibold ${ESTILOS_AVISO[tipo]} ${className}`}
    >
      {children}
    </div>
  )
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-lg text-slate-700">
      {children}
    </p>
  )
}
