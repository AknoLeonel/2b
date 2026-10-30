import Link from 'next/link'
import { linkComoChegar, linkWhatsapp, localidade, type PostoPublico } from '@/lib/site'

export function CartaoPostoPublico({ posto }: { posto: PostoPublico }) {
  const comoChegar = linkComoChegar(posto)
  const whatsapp = linkWhatsapp(posto.whatsapp, `Olá! Vim pelo site e gostaria de falar com o ${posto.nome}.`)
  const lugar = localidade(posto)

  return (
    <article className="cartao flex flex-col overflow-hidden">
      <div className="border-l-8 border-marca p-5">
        <h3 className="text-lg font-extrabold text-tinta">
          <Link href={`/postos/${posto.slug}`} className="hover:text-marca hover:underline">
            {posto.nome}
          </Link>
        </h3>
        {lugar ? <p className="mt-0.5 text-sm font-medium text-slate-600">{lugar}</p> : null}
        {posto.aberto_24h ? (
          <p className="mt-2 inline-block rounded-md bg-destaque-claro px-2 py-0.5 text-xs font-bold text-amber-900">
            Aberto 24 horas
          </p>
        ) : posto.horario ? (
          <p className="mt-2 text-sm text-slate-600">{posto.horario}</p>
        ) : null}
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Combustíveis do ${posto.nome}`}>
          {posto.produtos.map((p) => (
            <li key={p.codigo} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {p.nome}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 p-4">
        <Link href={`/postos/${posto.slug}`} className="botao-secundario min-h-11 flex-1 px-3 text-sm">
          Ver posto
        </Link>
        {comoChegar ? (
          <a href={comoChegar} target="_blank" rel="noopener" className="botao-escuro min-h-11 flex-1 px-3 text-sm">
            Como chegar
          </a>
        ) : null}
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener" className="botao-whatsapp min-h-11 flex-1 px-3 text-sm">
            WhatsApp
          </a>
        ) : null}
      </div>
    </article>
  )
}
